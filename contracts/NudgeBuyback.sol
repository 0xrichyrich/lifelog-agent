// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title NudgeBuyback
 * @notice Buys $NUDGE from nad.fun curve and distributes to users
 * @dev Treasury calls this to convert fees into $NUDGE rewards
 * @custom:security-contact security@littlenudge.app
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

contract NudgeBuyback is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // nad.fun contracts (configurable for testnet/mainnet)
    address public bondingCurveRouter;
    address public lens;
    
    // $NUDGE token on nad.fun
    address public nudgeToken;
    
    // Configuration
    uint256 public minBuybackAmount = 0.01 ether; // Minimum MON for buyback
    uint256 public buybackDeadlineSeconds = 300;   // 5 minutes default
    
    // Rewards distribution
    mapping(address => uint256) public pendingRewards;
    uint256 public totalPendingRewards;
    
    // Eligible users for rewards
    address[] public rewardRecipients;
    mapping(address => bool) public isRecipient;
    mapping(address => uint256) private recipientIndex; // For O(1) removal
    
    // Events
    event BuybackExecuted(uint256 monSpent, uint256 nudgeReceived);
    event RewardsDistributed(uint256 totalAmount, uint256 recipientCount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RecipientAdded(address indexed user);
    event RecipientRemoved(address indexed user);
    event NudgeTokenSet(address token);
    event RouterUpdated(address oldRouter, address newRouter);
    event LensUpdated(address oldLens, address newLens);
    event ConfigUpdated(uint256 minBuyback, uint256 deadline);

    constructor(
        address _owner,
        address _router,
        address _lens
    ) Ownable(_owner) {
        require(_router != address(0), "Invalid router");
        require(_lens != address(0), "Invalid lens");
        bondingCurveRouter = _router;
        lens = _lens;
    }

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
     * @notice Update nad.fun router address
     * @param _router New router address
     */
    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), "Invalid router");
        address old = bondingCurveRouter;
        bondingCurveRouter = _router;
        emit RouterUpdated(old, _router);
    }

    /**
     * @notice Update nad.fun lens address
     * @param _lens New lens address
     */
    function setLens(address _lens) external onlyOwner {
        require(_lens != address(0), "Invalid lens");
        address old = lens;
        lens = _lens;
        emit LensUpdated(old, _lens);
    }

    /**
     * @notice Update buyback configuration
     * @param _minBuyback Minimum MON amount for buyback
     * @param _deadline Deadline in seconds for buyback tx
     */
    function setConfig(uint256 _minBuyback, uint256 _deadline) external onlyOwner {
        require(_deadline >= 60, "Deadline too short");
        minBuybackAmount = _minBuyback;
        buybackDeadlineSeconds = _deadline;
        emit ConfigUpdated(_minBuyback, _deadline);
    }

    /**
     * @notice Execute buyback - swap MON for $NUDGE on nad.fun
     * @param slippageBps Slippage tolerance in basis points (e.g., 100 = 1%)
     */
    function executeBuyback(uint256 slippageBps) external onlyOwner nonReentrant whenNotPaused {
        require(nudgeToken != address(0), "NUDGE token not set");
        require(address(this).balance >= minBuybackAmount, "Below minimum buyback");
        require(slippageBps <= 1000, "Slippage too high"); // Max 10%
        
        uint256 monAmount = address(this).balance;
        
        // Track balance before buyback (FIX: HIGH-1)
        uint256 balanceBefore = IERC20(nudgeToken).balanceOf(address(this));
        
        // Get quote from Lens
        (, uint256 expectedOut) = ILens(lens).getAmountOut(
            nudgeToken,
            monAmount,
            true // isBuy
        );
        
        require(expectedOut > 0, "No liquidity");
        
        // Calculate minimum with slippage
        uint256 minOut = (expectedOut * (10000 - slippageBps)) / 10000;
        
        // Execute buy on nad.fun
        IBondingCurveRouter.BuyParams memory params = IBondingCurveRouter.BuyParams({
            amountOutMin: minOut,
            token: nudgeToken,
            to: address(this),
            deadline: block.timestamp + buybackDeadlineSeconds
        });
        
        IBondingCurveRouter(bondingCurveRouter).buy{value: monAmount}(params);
        
        // Calculate actual tokens received (FIX: HIGH-1)
        uint256 balanceAfter = IERC20(nudgeToken).balanceOf(address(this));
        uint256 nudgeReceived = balanceAfter - balanceBefore;
        
        require(nudgeReceived > 0, "Buyback failed");
        
        emit BuybackExecuted(monAmount, nudgeReceived);
    }

    /**
     * @notice Distribute bought $NUDGE to eligible users
     * @dev Equal distribution to all recipients
     */
    function distributeRewards() external onlyOwner nonReentrant whenNotPaused {
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
    ) external onlyOwner nonReentrant whenNotPaused {
        require(nudgeToken != address(0), "NUDGE token not set");
        require(users.length == amounts.length, "Length mismatch");
        require(users.length <= 100, "Too many users"); // Gas limit
        
        uint256 total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }
        
        uint256 balance = IERC20(nudgeToken).balanceOf(address(this));
        require(balance - totalPendingRewards >= total, "Insufficient balance");
        
        for (uint256 i = 0; i < users.length; i++) {
            if (users[i] != address(0) && amounts[i] > 0) {
                pendingRewards[users[i]] += amounts[i];
            }
        }
        
        totalPendingRewards += total;
        
        emit RewardsDistributed(total, users.length);
    }

    /**
     * @notice User claims their $NUDGE rewards
     */
    function claimRewards() external nonReentrant whenNotPaused {
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
        recipientIndex[user] = rewardRecipients.length;
        rewardRecipients.push(user);
        
        emit RecipientAdded(user);
    }

    /**
     * @notice Batch add recipients
     * @param users Array of addresses to add
     */
    function addRecipientsBatch(address[] calldata users) external onlyOwner {
        require(users.length <= 100, "Too many users");
        for (uint256 i = 0; i < users.length; i++) {
            if (!isRecipient[users[i]] && users[i] != address(0)) {
                isRecipient[users[i]] = true;
                recipientIndex[users[i]] = rewardRecipients.length;
                rewardRecipients.push(users[i]);
                emit RecipientAdded(users[i]);
            }
        }
    }

    /**
     * @notice Remove user from recipients (O(1) removal)
     * @param user Address to remove
     */
    function removeRecipient(address user) external onlyOwner {
        require(isRecipient[user], "Not a recipient");
        
        isRecipient[user] = false;
        
        // O(1) removal using swap-and-pop
        uint256 index = recipientIndex[user];
        uint256 lastIndex = rewardRecipients.length - 1;
        
        if (index != lastIndex) {
            address lastUser = rewardRecipients[lastIndex];
            rewardRecipients[index] = lastUser;
            recipientIndex[lastUser] = index;
        }
        
        rewardRecipients.pop();
        delete recipientIndex[user];
        
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
     * @notice Get all recipients (paginated)
     * @param offset Start index
     * @param limit Max items to return
     */
    function getRecipients(uint256 offset, uint256 limit) external view returns (address[] memory) {
        uint256 total = rewardRecipients.length;
        if (offset >= total) {
            return new address[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        address[] memory result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = rewardRecipients[i];
        }
        return result;
    }

    /**
     * @notice Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        
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
