// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title NudgeFeeSplitter
 * @notice Splits agent fees between creators and platform treasury
 * @dev Platform treasury funds are used for $NUDGE buybacks and user rewards
 * @custom:security-contact security@littlenudge.app
 */
contract NudgeFeeSplitter is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Fee split configuration (basis points, 10000 = 100%)
    uint256 public agentShareBps = 8000;  // 80% to agent
    uint256 public treasuryShareBps = 2000; // 20% to treasury
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant MIN_AGENT_SHARE = 5000; // Min 50% to agents

    // Treasury wallet for buybacks
    address public treasury;

    // Accepted payment tokens
    mapping(address => bool) public acceptedTokens;

    // Agent wallet registry
    mapping(bytes32 => address) public agentWallets; // agentId => wallet
    mapping(bytes32 => bool) public agentActive;      // agentId => active status

    // Accumulated fees per agent (for claiming)
    mapping(address => mapping(address => uint256)) public pendingFees; // agent => token => amount

    // Statistics
    uint256 public totalFeesCollected;
    uint256 public totalTreasuryFees;
    mapping(address => uint256) public agentTotalEarned; // agent wallet => total earned

    // Events
    event PaymentReceived(
        bytes32 indexed agentId,
        address indexed payer,
        address indexed token,
        uint256 totalAmount,
        uint256 agentAmount,
        uint256 treasuryAmount
    );
    event AgentRegistered(bytes32 indexed agentId, address wallet);
    event AgentWalletChanged(bytes32 indexed agentId, address oldWallet, address newWallet);
    event AgentStatusChanged(bytes32 indexed agentId, bool active);
    event FeesClaimed(address indexed agent, address indexed token, uint256 amount);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event SplitUpdated(uint256 agentShareBps, uint256 treasuryShareBps);
    event TokenAccepted(address token, bool accepted);

    constructor(address _treasury, address _owner) Ownable(_owner) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
    }

    /**
     * @notice Register an agent's wallet address
     * @param agentId Unique identifier for the agent
     * @param wallet Agent's payment wallet
     */
    function registerAgent(bytes32 agentId, address wallet) external onlyOwner {
        require(wallet != address(0), "Invalid wallet");
        address existing = agentWallets[agentId];
        if (existing != address(0)) {
            emit AgentWalletChanged(agentId, existing, wallet);
        }
        agentWallets[agentId] = wallet;
        agentActive[agentId] = true;
        emit AgentRegistered(agentId, wallet);
    }

    /**
     * @notice Set agent active status
     * @param agentId Agent identifier
     * @param active Whether agent can receive payments
     */
    function setAgentActive(bytes32 agentId, bool active) external onlyOwner {
        require(agentWallets[agentId] != address(0), "Agent not registered");
        agentActive[agentId] = active;
        emit AgentStatusChanged(agentId, active);
    }

    /**
     * @notice Pay for agent services (ERC20)
     * @param agentId The agent being paid
     * @param token Payment token address
     * @param amount Total payment amount
     */
    function payAgent(
        bytes32 agentId,
        address token,
        uint256 amount
    ) external nonReentrant whenNotPaused {
        require(acceptedTokens[token], "Token not accepted");
        require(amount > 0, "Amount must be > 0");
        
        address agentWallet = agentWallets[agentId];
        require(agentWallet != address(0), "Agent not registered");
        require(agentActive[agentId], "Agent not active");

        // Transfer tokens from payer
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Calculate splits
        uint256 agentAmount = (amount * agentShareBps) / BPS_DENOMINATOR;
        uint256 treasuryAmount = amount - agentAmount;

        // Transfer to treasury immediately
        if (treasuryAmount > 0) {
            IERC20(token).safeTransfer(treasury, treasuryAmount);
            totalTreasuryFees += treasuryAmount;
        }

        // Accumulate agent fees (they claim later to save gas)
        pendingFees[agentWallet][token] += agentAmount;
        agentTotalEarned[agentWallet] += agentAmount;
        totalFeesCollected += amount;

        emit PaymentReceived(agentId, msg.sender, token, amount, agentAmount, treasuryAmount);
    }

    /**
     * @notice Pay for agent services (native MON)
     * @param agentId The agent being paid
     */
    function payAgentNative(bytes32 agentId) external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "Amount must be > 0");
        
        address agentWallet = agentWallets[agentId];
        require(agentWallet != address(0), "Agent not registered");
        require(agentActive[agentId], "Agent not active");

        // Calculate splits
        uint256 agentAmount = (msg.value * agentShareBps) / BPS_DENOMINATOR;
        uint256 treasuryAmount = msg.value - agentAmount;

        // Transfer to treasury immediately
        if (treasuryAmount > 0) {
            (bool sent, ) = treasury.call{value: treasuryAmount}("");
            require(sent, "Treasury transfer failed");
            totalTreasuryFees += treasuryAmount;
        }

        // Accumulate agent fees
        pendingFees[agentWallet][address(0)] += agentAmount;
        agentTotalEarned[agentWallet] += agentAmount;
        totalFeesCollected += msg.value;

        emit PaymentReceived(agentId, msg.sender, address(0), msg.value, agentAmount, treasuryAmount);
    }

    /**
     * @notice Agent claims accumulated fees
     * @param token Token to claim (address(0) for native MON)
     */
    function claimFees(address token) external nonReentrant whenNotPaused {
        uint256 amount = pendingFees[msg.sender][token];
        require(amount > 0, "No fees to claim");

        pendingFees[msg.sender][token] = 0;

        if (token == address(0)) {
            (bool sent, ) = msg.sender.call{value: amount}("");
            require(sent, "Transfer failed");
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }

        emit FeesClaimed(msg.sender, token, amount);
    }

    /**
     * @notice Batch claim multiple tokens
     * @param tokens Array of token addresses to claim (max 20)
     */
    function claimFeesBatch(address[] calldata tokens) external nonReentrant whenNotPaused {
        require(tokens.length <= 20, "Too many tokens");
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 amount = pendingFees[msg.sender][token];
            
            if (amount > 0) {
                pendingFees[msg.sender][token] = 0;

                if (token == address(0)) {
                    (bool sent, ) = msg.sender.call{value: amount}("");
                    require(sent, "Transfer failed");
                } else {
                    IERC20(token).safeTransfer(msg.sender, amount);
                }

                emit FeesClaimed(msg.sender, token, amount);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // View Functions
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Get agent info
     * @param agentId Agent identifier
     */
    function getAgentInfo(bytes32 agentId) external view returns (
        address wallet,
        bool active,
        uint256 totalEarned
    ) {
        wallet = agentWallets[agentId];
        active = agentActive[agentId];
        totalEarned = agentTotalEarned[wallet];
    }

    /**
     * @notice Get pending fees for an agent
     * @param agentWallet Agent's wallet address
     * @param token Token to check
     */
    function getPendingFees(address agentWallet, address token) external view returns (uint256) {
        return pendingFees[agentWallet][token];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Admin Functions
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Update fee split percentages
     * @param _agentShareBps Agent share in basis points
     */
    function updateSplit(uint256 _agentShareBps) external onlyOwner {
        require(_agentShareBps >= MIN_AGENT_SHARE, "Agent share too low");
        require(_agentShareBps <= BPS_DENOMINATOR, "Invalid split");
        agentShareBps = _agentShareBps;
        treasuryShareBps = BPS_DENOMINATOR - _agentShareBps;
        emit SplitUpdated(agentShareBps, treasuryShareBps);
    }

    /**
     * @notice Update treasury address
     * @param _treasury New treasury address
     */
    function updateTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        address old = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(old, _treasury);
    }

    /**
     * @notice Set accepted payment tokens
     * @param token Token address
     * @param accepted Whether to accept this token
     */
    function setAcceptedToken(address token, bool accepted) external onlyOwner {
        acceptedTokens[token] = accepted;
        emit TokenAccepted(token, accepted);
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
     * @notice Emergency withdraw (only owner)
     * @param token Token to withdraw (address(0) for native)
     * @param to Recipient address
     * @param amount Amount to withdraw
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

    // Allow receiving native tokens
    receive() external payable {}
}
