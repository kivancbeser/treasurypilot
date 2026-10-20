// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @notice Unreviewed native-asset prototype. TEST ASSETS ONLY. No token custody or upgrades.
contract TreasuryPilotVault {
    address public immutable admin;
    address public immutable reviewer;
    uint256[4] public balances;
    uint256[4] public reserved;
    uint256[4] public weights = [uint256(40), 30, 20, 10];
    uint256 public nextId;
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;
    mapping(address => uint256) public credits;
    enum Status { Pending, Approved, Rejected, Cancelled }
    struct Payment { uint8 bucket; address recipient; uint256 amount; Status status; bytes32 memoHash; }
    mapping(uint256 => Payment) public payments;
    bool private locked;
    event Deposited(address indexed sender, uint256 amount);
    event PolicyChanged(uint256[4] weights);
    event Requested(uint256 indexed id, uint8 bucket, address indexed recipient, uint256 amount, bytes32 memoHash);
    event Resolved(uint256 indexed id, Status status);
    event Withdrawn(address indexed recipient, uint256 amount);
    modifier onlyAdmin() { require(msg.sender == admin, "ADMIN_ONLY"); _; }
    constructor(address admin_, address reviewer_) {
        require(admin_ != address(0) && reviewer_ != address(0) && admin_ != reviewer_, "DISTINCT_ROLES_REQUIRED");
        admin = admin_; reviewer = reviewer_;
    }
    function deposit() external payable {
        require(msg.value > 0, "ZERO_DEPOSIT");
        uint256[4] memory shares;
        uint256[4] memory fractions;
        uint256 allocated;
        for (uint256 i; i < 4; ++i) {
            shares[i] = (msg.value / 100) * weights[i] + ((msg.value % 100) * weights[i]) / 100;
            fractions[i] = ((msg.value % 100) * weights[i]) % 100;
            allocated += shares[i];
        }
        for (uint256 left = msg.value - allocated; left > 0; --left) {
            uint256 best;
            for (uint256 i = 1; i < 4; ++i) if (fractions[i] > fractions[best]) best = i;
            shares[best]++; fractions[best] = 0;
        }
        for (uint256 i; i < 4; ++i) balances[i] += shares[i];
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
    function setPolicy(uint256[4] calldata values) external onlyAdmin {
        uint256 sum;
        for (uint256 i; i < 4; ++i) { require(values[i] <= 100, "BAD_WEIGHT"); sum += values[i]; }
        require(sum == 100, "TOTAL_MUST_BE_100");
        weights = values; emit PolicyChanged(values);
    }
    function request(uint8 bucket, address recipient, uint256 amount, bytes32 memoHash) external onlyAdmin returns (uint256 id) {
        require(bucket < 4 && recipient != address(0) && recipient != address(this) && amount > 0, "INVALID_REQUEST");
        require(amount <= balances[bucket] - reserved[bucket], "INSUFFICIENT_AVAILABLE");
        id = nextId++;
        payments[id] = Payment(bucket, recipient, amount, Status.Pending, memoHash);
        reserved[bucket] += amount;
        emit Requested(id, bucket, recipient, amount, memoHash);
    }
    function review(uint256 id, bool approve) external {
        require(msg.sender == reviewer, "REVIEWER_ONLY");
        _resolve(id, approve ? Status.Approved : Status.Rejected);
    }
    function cancel(uint256 id) external onlyAdmin { _resolve(id, Status.Cancelled); }
    function _resolve(uint256 id, Status status) private {
        require(id < nextId && payments[id].status == Status.Pending, "NOT_PENDING");
        Payment storage p = payments[id];
        reserved[p.bucket] -= p.amount;
        p.status = status;
        if (status == Status.Approved) { balances[p.bucket] -= p.amount; credits[p.recipient] += p.amount; }
        emit Resolved(id, status);
    }
    function withdraw() external {
        require(!locked, "REENTRANT");
        uint256 amount = credits[msg.sender]; require(amount > 0, "NO_CREDIT");
        locked = true; credits[msg.sender] = 0; totalWithdrawn += amount;
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "TRANSFER_FAILED"); locked = false;
        emit Withdrawn(msg.sender, amount);
    }
}
