// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Nudge Token ($NUDGE)
 * @notice The AI life coach that pays you to improve. Earn $NUDGE by hitting your daily goals.
 * @dev ERC-20 token on Monad with reward minting and burn mechanics
 */
contract NudgeToken is ERC20, ERC20Burnable, Ownable, Pausable, ReentrancyGuard {
    // ============ Events ============
    event GoalCompleted(address indexed user, uint256 goalId, uint256 reward);
    event RewardRateUpdated(uint256 indexed goalType, uint256 newRate);
    event FeatureUnlocked(address indexed user, string feature, uint256 cost);
    event MinterUpdated(address indexed minter, bool authorized);

    // ============ State ============
    
    // Authorized minters (backend systems that can award tokens)
    mapping(address => bool) public minters;
    
    // Reward rates per goal type (in wei)
    // goalType: 0 = daily, 1 = weekly, 2 = streak
    mapping(uint256 => uint256) public rewardRates;
    
    // Track user rewards for analytics
    mapping(address => uint256) public totalRewardsEarned;
    mapping(address => uint256) public goalsCompleted;
    
    // Feature unlock costs (in tokens)
    mapping(string => uint256) public featureCosts;
    
    // Claimed goal IDs to prevent double claiming
    mapping(bytes32 => bool) public claimedGoals;

    // Maximum supply cap (1 billion tokens)
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18;
    
    // Initial reward rates
    uint256 public constant DEFAULT_DAILY_REWARD = 100 * 10**18;    // 100 $NUDGE per daily goal
    uint256 public constant DEFAULT_WEEKLY_REWARD = 500 * 10**18;   // 500 $NUDGE per weekly goal
    uint256 public constant DEFAULT_STREAK_REWARD = 50 * 10**18;    // 50 $NUDGE per streak day

    // ============ Constructor ============
    
    constructor() ERC20("Nudge", "NUDGE") Ownable(msg.sender) {
        // Set default reward rates
        rewardRates[0] = DEFAULT_DAILY_REWARD;   // daily
        rewardRates[1] = DEFAULT_WEEKLY_REWARD;  // weekly
        rewardRates[2] = DEFAULT_STREAK_REWARD;  // streak
        
        // Set default feature costs
        featureCosts["premium_insights"] = 1000 * 10**18;     // 1000 $NUDGE
        featureCosts["ai_coach_call"] = 500 * 10**18;         // 500 $NUDGE
        featureCosts["custom_goals"] = 250 * 10**18;          // 250 $NUDGE
        featureCosts["export_reports"] = 100 * 10**18;        // 100 $NUDGE
        featureCosts["agent_discount"] = 2000 * 10**18;       // 2000 $NUDGE (discounted ACP services)
        
        // Owner is initial minter
        minters[msg.sender] = true;
        emit MinterUpdated(msg.sender, true);
    }

    // ============ Modifiers ============
    
    modifier onlyMinter() {
        require(minters[msg.sender], "NudgeToken: not authorized minter");
        _;
    }

    // ============ Minting (Rewards) ============
    
    /**
     * @notice Mint tokens as reward for completing a goal
     * @param to Recipient address
     * @param goalId Unique goal identifier (prevents double claims)
     * @param goalType 0=daily, 1=weekly, 2=streak
     */
    function rewardGoalCompletion(
        address to,
        uint256 goalId,
        uint256 goalType
    ) external onlyMinter whenNotPaused nonReentrant {
        bytes32 claimKey = keccak256(abi.encodePacked(to, goalId));
        require(!claimedGoals[claimKey], "NudgeToken: goal already claimed");
        
        uint256 reward = rewardRates[goalType];
        require(reward > 0, "NudgeToken: invalid goal type");
        require(totalSupply() + reward <= MAX_SUPPLY, "NudgeToken: max supply exceeded");
        
        claimedGoals[claimKey] = true;
        totalRewardsEarned[to] += reward;
        goalsCompleted[to] += 1;
        
        _mint(to, reward);
        emit GoalCompleted(to, goalId, reward);
    }

    /**
     * @notice Batch reward multiple goals at once (gas efficient)
     * @param to Recipient address
     * @param goalIds Array of goal IDs
     * @param goalTypes Array of goal types
     */
    function rewardGoalsBatch(
        address to,
        uint256[] calldata goalIds,
        uint256[] calldata goalTypes
    ) external onlyMinter whenNotPaused nonReentrant {
        require(goalIds.length == goalTypes.length, "NudgeToken: length mismatch");
        
        uint256 totalReward = 0;
        
        for (uint256 i = 0; i < goalIds.length; i++) {
            bytes32 claimKey = keccak256(abi.encodePacked(to, goalIds[i]));
            if (!claimedGoals[claimKey]) {
                uint256 reward = rewardRates[goalTypes[i]];
                if (reward > 0) {
                    claimedGoals[claimKey] = true;
                    goalsCompleted[to] += 1;
                    totalReward += reward;
                    emit GoalCompleted(to, goalIds[i], reward);
                }
            }
        }
        
        require(totalSupply() + totalReward <= MAX_SUPPLY, "NudgeToken: max supply exceeded");
        totalRewardsEarned[to] += totalReward;
        _mint(to, totalReward);
    }

    // ============ Burning (Feature Unlock) ============
    
    /**
     * @notice Burn tokens to unlock a premium feature
     * @param feature Feature identifier
     */
    function unlockFeature(string calldata feature) external whenNotPaused nonReentrant {
        uint256 cost = featureCosts[feature];
        require(cost > 0, "NudgeToken: unknown feature");
        require(balanceOf(msg.sender) >= cost, "NudgeToken: insufficient balance");
        
        _burn(msg.sender, cost);
        emit FeatureUnlocked(msg.sender, feature, cost);
    }

    // ============ Admin Functions ============
    
    /**
     * @notice Set reward rate for a goal type
     * @param goalType 0=daily, 1=weekly, 2=streak
     * @param rate Reward amount in wei
     */
    function setRewardRate(uint256 goalType, uint256 rate) external onlyOwner {
        rewardRates[goalType] = rate;
        emit RewardRateUpdated(goalType, rate);
    }

    /**
     * @notice Set cost for a feature
     * @param feature Feature identifier
     * @param cost Cost in tokens (wei)
     */
    function setFeatureCost(string calldata feature, uint256 cost) external onlyOwner {
        featureCosts[feature] = cost;
    }

    /**
     * @notice Add or remove minter authorization
     * @param minter Address to update
     * @param authorized Whether to authorize or revoke
     */
    function setMinter(address minter, bool authorized) external onlyOwner {
        minters[minter] = authorized;
        emit MinterUpdated(minter, authorized);
    }

    /**
     * @notice Pause all minting and burning
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause minting and burning
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ View Functions ============
    
    /**
     * @notice Get user stats
     * @param user Address to query
     * @return balance Current token balance
     * @return earned Total rewards ever earned
     * @return completed Total goals completed
     */
    function getUserStats(address user) external view returns (
        uint256 balance,
        uint256 earned,
        uint256 completed
    ) {
        return (balanceOf(user), totalRewardsEarned[user], goalsCompleted[user]);
    }

    /**
     * @notice Check if a goal has been claimed
     * @param user User address
     * @param goalId Goal identifier
     */
    function isGoalClaimed(address user, uint256 goalId) external view returns (bool) {
        return claimedGoals[keccak256(abi.encodePacked(user, goalId))];
    }
}
