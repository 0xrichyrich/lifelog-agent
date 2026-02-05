// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NudgeBuyback
 * @notice Buys $NUDGE from nad.fun curve and distributes to users
 * @dev Treasury calls this to convert fees into $NUDGE rewards
 */

// nad.fun BondingCurveRouter interface
interface IBondingCurveRouter {
    struct BuyParams {
        uint256 amountOutMin;
        address token;
        address to;
        uint256 deadline;
    }
    
    function buy(BuyParams calldata params) external payable;
}

// nad.fun Lens interface for quotes
interface ILens {
    function getAmountOut(
        address token,
        uint256 amountIn,
        bool isBuy
    ) external view returns (address router, uint256 amountOut);
}

contract NudgeBuyback is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // nad.fun contracts (Monad Mainnet)
    address public constant BONDING_CURVE_ROUTER = 0x6F6B8F1a20703309951a5127c45B49b1CD981A22;
    address public constant LENS = 0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea;
    
    // $NUDGE token on nad.fun
    address public nudgeToken;
    
    // Rewards distribution
    mapping(address => uint256) public pendingRewards;
    uint256 public totalPendingRewards;
    
    // Eligible users for rewards
    address[] public rewardRecipients;
    mapping(address => bool) public isRecipient;
    
    // Events
    event BuybackExecuted(uint256 monSpent, uint256 nudgeReceived);
    event RewardsDistributed(uint256 totalAmount, uint256 recipientCount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RecipientAdded(address indexed user);
    event RecipientRemoved(address indexed user);
    event NudgeTokenSet(address token);

    constructor(address _owner) Ownable(_owner) {}

    /**
     * @notice Set the $NUDGE token address (after deployment on nad.fun)
     * @param _nudgeToken The $NUDGE token contract address
     */
    function setNudgeToken(address _nudgeToken) external onlyOwner {
        require(_nudgeToken != address(0), "Invalid token");
        nudgeToken = _nudgeToken;
        emit NudgeTokenSet(_nudgeToken);
    }

    /**
     * @notice Execute buyback - swap MON for $NUDGE on nad.fun
     * @param slippageBps Slippage tolerance in basis points (e.g., 100 = 1%)
     */
    function executeBuyback(uint256 slippageBps) external onlyOwner nonReentrant {
        require(nudgeToken != address(0), "NUDGE token not set");
        require(address(this).balance > 0, "No MON to spend");
        
        uint256 monAmount = address(this).balance;
        
        // Track balance before buyback (FIX: HIGH-1)
        uint256 balanceBefore = IERC20(nudgeToken).balanceOf(address(this));
        
        // Get quote from Lens
        (, uint256 expectedOut) = ILens(LENS).getAmountOut(
            nudgeToken,
            monAmount,
            true // isBuy
        );
        
        // Calculate minimum with slippage
        uint256 minOut = (expectedOut * (10000 - slippageBps)) / 10000;
        
        // Execute buy on nad.fun
        IBondingCurveRouter.BuyParams memory params = IBondingCurveRouter.BuyParams({
            amountOutMin: minOut,
            token: nudgeToken,
            to: address(this),
            deadline: block.timestamp + 300 // 5 min deadline
        });
        
        IBondingCurveRouter(BONDING_CURVE_ROUTER).buy{value: monAmount}(params);
        
        // Calculate actual tokens received (FIX: HIGH-1)
        uint256 balanceAfter = IERC20(nudgeToken).balanceOf(address(this));
        uint256 nudgeReceived = balanceAfter - balanceBefore;
        
        emit BuybackExecuted(monAmount, nudgeReceived);
    }

    /**
     * @notice Distribute bought $NUDGE to eligible users
     * @dev Equal distribution to all recipients
     */
    function distributeRewards() external onlyOwner nonReentrant {
        require(nudgeToken != address(0), "NUDGE token not set");
        
        uint256 balance = IERC20(nudgeToken).balanceOf(address(this));
        uint256 distributable = balance - totalPendingRewards;
        require(distributable > 0, "No rewards to distribute");
        require(rewardRecipients.length > 0, "No recipients");
        
        uint256 perUser = distributable / rewardRecipients.length;
        require(perUser > 0, "Amount too small");
        
        uint256 distributed = 0;
        for (uint256 i = 0; i < rewardRecipients.length; i++) {
            pendingRewards[rewardRecipients[i]] += perUser;
            distributed += perUser;
        }
        
        totalPendingRewards += distributed;
        
        emit RewardsDistributed(distributed, rewardRecipients.length);
    }

    /**
     * @notice Distribute with custom amounts per user
     * @param users Array of user addresses
     * @param amounts Array of amounts per user
     */
    function distributeRewardsCustom(
        address[] calldata users,
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant {
        require(nudgeToken != address(0), "NUDGE token not set");
        require(users.length == amounts.length, "Length mismatch");
        
        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        
        uint256 balance = IERC20(nudgeToken).balanceOf(address(this));
        require(balance - totalPendingRewards >= total, "Insufficient balance");
        
        for (uint256 i = 0; i < users.length; i++) {
            pendingRewards[users[i]] += amounts[i];
        }
        
        totalPendingRewards += total;
        
        emit RewardsDistributed(total, users.length);
    }

    /**
     * @notice User claims their $NUDGE rewards
     */
    function claimRewards() external nonReentrant {
        uint256 amount = pendingRewards[msg.sender];
        require(amount > 0, "No rewards to claim");
        
        pendingRewards[msg.sender] = 0;
        totalPendingRewards -= amount;
        
        IERC20(nudgeToken).safeTransfer(msg.sender, amount);
        
        emit RewardsClaimed(msg.sender, amount);
    }

    /**
     * @notice Add user to reward recipients list
     * @param user Address to add
     */
    function addRecipient(address user) external onlyOwner {
        require(!isRecipient[user], "Already recipient");
        require(user != address(0), "Invalid address");
        
        isRecipient[user] = true;
        rewardRecipients.push(user);
        
        emit RecipientAdded(user);
    }

    /**
     * @notice Batch add recipients
     * @param users Array of addresses to add
     */
    function addRecipientsBatch(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            if (!isRecipient[users[i]] && users[i] != address(0)) {
                isRecipient[users[i]] = true;
                rewardRecipients.push(users[i]);
                emit RecipientAdded(users[i]);
            }
        }
    }

    /**
     * @notice Remove user from recipients (doesn't affect pending rewards)
     * @param user Address to remove
     */
    function removeRecipient(address user) external onlyOwner {
        require(isRecipient[user], "Not a recipient");
        
        isRecipient[user] = false;
        
        // Find and remove from array
        for (uint256 i = 0; i < rewardRecipients.length; i++) {
            if (rewardRecipients[i] == user) {
                rewardRecipients[i] = rewardRecipients[rewardRecipients.length - 1];
                rewardRecipients.pop();
                break;
            }
        }
        
        emit RecipientRemoved(user);
    }

    /**
     * @notice Get recipient count
     */
    function getRecipientCount() external view returns (uint256) {
        return rewardRecipients.length;
    }

    /**
     * @notice Check pending rewards for a user
     */
    function getPendingRewards(address user) external view returns (uint256) {
        return pendingRewards[user];
    }

    /**
     * @notice Emergency withdraw
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (token == address(0)) {
            (bool sent, ) = to.call{value: amount}("");
            require(sent, "Transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    // Receive MON from treasury
    receive() external payable {}
}
