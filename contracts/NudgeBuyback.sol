// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title NudgeBuyback
 * @notice Buys $NUDGE from nad.fun curve and distributes to users based on weight
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

    // ═══════════════════════════════════════════════════════════════════════
    // Constants
    // ═══════════════════════════════════════════════════════════════════════
    
    uint256 public constant MAX_RECIPIENTS = 10000;
    uint256 public constant WEIGHT_PRECISION = 1e18;

    // ═══════════════════════════════════════════════════════════════════════
    // State Variables
    // ═══════════════════════════════════════════════════════════════════════

    // nad.fun contracts (configurable for testnet/mainnet)
    address public bondingCurveRouter;
    address public lens;
    
    // $NUDGE token on nad.fun
    address public nudgeToken;
    
    // Configuration
    uint256 public minBuybackAmount = 0.01 ether;
    uint256 public buybackDeadlineSeconds = 300;
    
    // Rewards distribution
    mapping(address => uint256) public pendingRewards;
    uint256 public totalPendingRewards;
    
    // Weighted distribution system
    mapping(address => uint256) public userWeight;
    uint256 public totalWeight;
    
    // Eligible users for rewards
    address[] public rewardRecipients;
    mapping(address => bool) public isRecipient;
    mapping(address => uint256) private recipientIndex;
    
    // Statistics
    uint256 public totalBuybacks;
    uint256 public totalDistributed;
    
    // ═══════════════════════════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════════════════════════

    event BuybackExecuted(uint256 monSpent, uint256 nudgeReceived);
    event RewardsDistributed(uint256 totalAmount, uint256 recipientCount, bool weighted);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RecipientAdded(address indexed user, uint256 weight);
    event RecipientRemoved(address indexed user);
    event WeightUpdated(address indexed user, uint256 oldWeight, uint256 newWeight);
    event NudgeTokenSet(address token);
    event RouterUpdated(address oldRouter, address newRouter);
    event LensUpdated(address oldLens, address newLens);
    event ConfigUpdated(uint256 minBuyback, uint256 deadline);

    // ═══════════════════════════════════════════════════════════════════════
    // Constructor
    // ═══════════════════════════════════════════════════════════════════════

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

    // ═══════════════════════════════════════════════════════════════════════
    // Configuration Functions
    // ═══════════════════════════════════════════════════════════════════════

    function setNudgeToken(address _nudgeToken) external onlyOwner {
        require(_nudgeToken != address(0), "Invalid token");
        nudgeToken = _nudgeToken;
        emit NudgeTokenSet(_nudgeToken);
    }

    function setRouter(address _router) external onlyOwner {
        require(_router != address(0), "Invalid router");
        address old = bondingCurveRouter;
        bondingCurveRouter = _router;
        emit RouterUpdated(old, _router);
    }

    function setLens(address _lens) external onlyOwner {
        require(_lens != address(0), "Invalid lens");
        address old = lens;
        lens = _lens;
        emit LensUpdated(old, _lens);
    }

    function setConfig(uint256 _minBuyback, uint256 _deadline) external onlyOwner {
        require(_deadline >= 60, "Deadline too short");
        minBuybackAmount = _minBuyback;
        buybackDeadlineSeconds = _deadline;
        emit ConfigUpdated(_minBuyback, _deadline);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Buyback Functions
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Execute buyback - swap MON for $NUDGE on nad.fun
     * @param slippageBps Slippage tolerance in basis points (e.g., 100 = 1%)
     */
    function executeBuyback(uint256 slippageBps) external onlyOwner nonReentrant whenNotPaused {
        require(nudgeToken != address(0), "NUDGE token not set");
        require(address(this).balance >= minBuybackAmount, "Below minimum buyback");
        require(slippageBps <= 1000, "Slippage too high");
        
        uint256 monAmount = address(this).balance;
        uint256 balanceBefore = IERC20(nudgeToken).balanceOf(address(this));
        
        (, uint256 expectedOut) = ILens(lens).getAmountOut(
            nudgeToken,
            monAmount,
            true
        );
        
        require(expectedOut > 0, "No liquidity");
        
        uint256 minOut = (expectedOut * (10000 - slippageBps)) / 10000;
        
        IBondingCurveRouter.BuyParams memory params = IBondingCurveRouter.BuyParams({
            amountOutMin: minOut,
            token: nudgeToken,
            to: address(this),
            deadline: block.timestamp + buybackDeadlineSeconds
        });
        
        IBondingCurveRouter(bondingCurveRouter).buy{value: monAmount}(params);
        
        uint256 balanceAfter = IERC20(nudgeToken).balanceOf(address(this));
        uint256 nudgeReceived = balanceAfter - balanceBefore;
        
        require(nudgeReceived > 0, "Buyback failed");
        totalBuybacks += monAmount;
        
        emit BuybackExecuted(monAmount, nudgeReceived);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Distribution Functions
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Distribute rewards weighted by user weight
     * @dev Users with higher weight get proportionally more rewards
     */
    function distributeRewardsWeighted() external onlyOwner nonReentrant whenNotPaused {
        require(nudgeToken != address(0), "NUDGE token not set");
        require(rewardRecipients.length > 0, "No recipients");
        require(totalWeight > 0, "No weight assigned");
        
        uint256 balance = IERC20(nudgeToken).balanceOf(address(this));
        uint256 distributable = balance - totalPendingRewards;
        require(distributable > 0, "No rewards to distribute");
        
        uint256 distributed = 0;
        for (uint256 i = 0; i < rewardRecipients.length; i++) {
            address user = rewardRecipients[i];
            if (userWeight[user] > 0) {
                // Calculate proportional share based on weight
                uint256 userShare = (distributable * userWeight[user]) / totalWeight;
                if (userShare > 0) {
                    pendingRewards[user] += userShare;
                    distributed += userShare;
                }
            }
        }
        
        require(distributed > 0, "Nothing distributed");
        totalPendingRewards += distributed;
        totalDistributed += distributed;
        
        emit RewardsDistributed(distributed, rewardRecipients.length, true);
    }

    /**
     * @notice Distribute rewards equally (legacy method)
     */
    function distributeRewardsEqual() external onlyOwner nonReentrant whenNotPaused {
        require(nudgeToken != address(0), "NUDGE token not set");
        require(rewardRecipients.length > 0, "No recipients");
        
        uint256 balance = IERC20(nudgeToken).balanceOf(address(this));
        uint256 distributable = balance - totalPendingRewards;
        require(distributable > 0, "No rewards to distribute");
        
        uint256 perUser = distributable / rewardRecipients.length;
        require(perUser > 0, "Amount too small");
        
        uint256 distributed = 0;
        for (uint256 i = 0; i < rewardRecipients.length; i++) {
            pendingRewards[rewardRecipients[i]] += perUser;
            distributed += perUser;
        }
        
        totalPendingRewards += distributed;
        totalDistributed += distributed;
        
        emit RewardsDistributed(distributed, rewardRecipients.length, false);
    }

    /**
     * @notice Distribute with custom amounts per user
     */
    function distributeRewardsCustom(
        address[] calldata users,
        uint256[] calldata amounts
    ) external onlyOwner nonReentrant whenNotPaused {
        require(nudgeToken != address(0), "NUDGE token not set");
        require(users.length == amounts.length, "Length mismatch");
        require(users.length <= 100, "Too many users");
        
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
        totalDistributed += total;
        
        emit RewardsDistributed(total, users.length, false);
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

    // ═══════════════════════════════════════════════════════════════════════
    // Recipient & Weight Management
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Add user with weight
     * @param user Address to add
     * @param weight User's weight (use WEIGHT_PRECISION as base, e.g., 1e18 = 1x)
     */
    function addRecipient(address user, uint256 weight) external onlyOwner {
        require(!isRecipient[user], "Already recipient");
        require(user != address(0), "Invalid address");
        require(rewardRecipients.length < MAX_RECIPIENTS, "Max recipients reached");
        require(weight > 0, "Weight must be > 0");
        
        isRecipient[user] = true;
        recipientIndex[user] = rewardRecipients.length;
        rewardRecipients.push(user);
        
        userWeight[user] = weight;
        totalWeight += weight;
        
        emit RecipientAdded(user, weight);
    }

    /**
     * @notice Add user with default weight (1x)
     */
    function addRecipientDefault(address user) external onlyOwner {
        require(!isRecipient[user], "Already recipient");
        require(user != address(0), "Invalid address");
        require(rewardRecipients.length < MAX_RECIPIENTS, "Max recipients reached");
        
        isRecipient[user] = true;
        recipientIndex[user] = rewardRecipients.length;
        rewardRecipients.push(user);
        
        userWeight[user] = WEIGHT_PRECISION; // 1x weight
        totalWeight += WEIGHT_PRECISION;
        
        emit RecipientAdded(user, WEIGHT_PRECISION);
    }

    /**
     * @notice Batch add recipients with default weight
     */
    function addRecipientsBatch(address[] calldata users) external onlyOwner {
        require(users.length <= 100, "Too many users");
        require(rewardRecipients.length + users.length <= MAX_RECIPIENTS, "Would exceed max");
        
        for (uint256 i = 0; i < users.length; i++) {
            if (!isRecipient[users[i]] && users[i] != address(0)) {
                isRecipient[users[i]] = true;
                recipientIndex[users[i]] = rewardRecipients.length;
                rewardRecipients.push(users[i]);
                
                userWeight[users[i]] = WEIGHT_PRECISION;
                totalWeight += WEIGHT_PRECISION;
                
                emit RecipientAdded(users[i], WEIGHT_PRECISION);
            }
        }
    }

    /**
     * @notice Batch add recipients with custom weights
     */
    function addRecipientsBatchWeighted(
        address[] calldata users,
        uint256[] calldata weights
    ) external onlyOwner {
        require(users.length == weights.length, "Length mismatch");
        require(users.length <= 100, "Too many users");
        require(rewardRecipients.length + users.length <= MAX_RECIPIENTS, "Would exceed max");
        
        for (uint256 i = 0; i < users.length; i++) {
            if (!isRecipient[users[i]] && users[i] != address(0) && weights[i] > 0) {
                isRecipient[users[i]] = true;
                recipientIndex[users[i]] = rewardRecipients.length;
                rewardRecipients.push(users[i]);
                
                userWeight[users[i]] = weights[i];
                totalWeight += weights[i];
                
                emit RecipientAdded(users[i], weights[i]);
            }
        }
    }

    /**
     * @notice Update user's weight
     * @param user Address to update
     * @param newWeight New weight value
     */
    function updateWeight(address user, uint256 newWeight) external onlyOwner {
        require(isRecipient[user], "Not a recipient");
        require(newWeight > 0, "Weight must be > 0");
        
        uint256 oldWeight = userWeight[user];
        totalWeight = totalWeight - oldWeight + newWeight;
        userWeight[user] = newWeight;
        
        emit WeightUpdated(user, oldWeight, newWeight);
    }

    /**
     * @notice Batch update weights
     */
    function updateWeightsBatch(
        address[] calldata users,
        uint256[] calldata weights
    ) external onlyOwner {
        require(users.length == weights.length, "Length mismatch");
        require(users.length <= 100, "Too many users");
        
        for (uint256 i = 0; i < users.length; i++) {
            if (isRecipient[users[i]] && weights[i] > 0) {
                uint256 oldWeight = userWeight[users[i]];
                totalWeight = totalWeight - oldWeight + weights[i];
                userWeight[users[i]] = weights[i];
                
                emit WeightUpdated(users[i], oldWeight, weights[i]);
            }
        }
    }

    /**
     * @notice Remove user from recipients (O(1) removal)
     */
    function removeRecipient(address user) external onlyOwner {
        require(isRecipient[user], "Not a recipient");
        
        // Remove weight
        totalWeight -= userWeight[user];
        delete userWeight[user];
        
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

    // ═══════════════════════════════════════════════════════════════════════
    // View Functions
    // ═══════════════════════════════════════════════════════════════════════

    function getRecipientCount() external view returns (uint256) {
        return rewardRecipients.length;
    }

    function getPendingRewards(address user) external view returns (uint256) {
        return pendingRewards[user];
    }

    function getUserWeight(address user) external view returns (uint256) {
        return userWeight[user];
    }

    /**
     * @notice Get user's share percentage (in basis points)
     */
    function getUserShareBps(address user) external view returns (uint256) {
        if (totalWeight == 0 || userWeight[user] == 0) return 0;
        return (userWeight[user] * 10000) / totalWeight;
    }

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
     * @notice Get contract stats
     */
    function getStats() external view returns (
        uint256 _totalBuybacks,
        uint256 _totalDistributed,
        uint256 _totalPending,
        uint256 _recipientCount,
        uint256 _totalWeight
    ) {
        return (
            totalBuybacks,
            totalDistributed,
            totalPendingRewards,
            rewardRecipients.length,
            totalWeight
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Admin Functions
    // ═══════════════════════════════════════════════════════════════════════

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

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

    receive() external payable {}
}
