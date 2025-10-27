import { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useInheritanceHistory } from '../hooks/useInheritanceHistory';

export function History() {
  const { contract, account, networkInfo } = useOutletContext();
  const navigate = useNavigate();
  const { deposits, loading, error } = useInheritanceHistory(contract, account);

  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created-desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Apply filters and sorting
  const filteredAndSortedDeposits = useMemo(() => {
    let result = [...deposits];

    // Role filter
    if (roleFilter !== 'all') {
      result = result.filter(d => d.role === roleFilter || d.role === 'both');
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(d => d.status === statusFilter);
    }

    // Date range filter
    if (startDate) {
      const startTimestamp = new Date(startDate).getTime() / 1000;
      result = result.filter(d => d.deadline >= startTimestamp);
    }
    if (endDate) {
      const endTimestamp = new Date(endDate).getTime() / 1000;
      result = result.filter(d => d.deadline <= endTimestamp);
    }

    // Sorting
    switch (sortBy) {
      case 'deadline-asc':
        result.sort((a, b) => a.deadline - b.deadline);
        break;
      case 'deadline-desc':
        result.sort((a, b) => b.deadline - a.deadline);
        break;
      case 'amount-asc':
        result.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
        break;
      case 'amount-desc':
        result.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
        break;
      case 'created-asc':
        result.sort((a, b) => a.blockNumber - b.blockNumber);
        break;
      case 'created-desc':
      default:
        result.sort((a, b) => b.blockNumber - a.blockNumber);
        break;
    }

    return result;
  }, [deposits, roleFilter, statusFilter, sortBy, startDate, endDate]);

  const handleViewDetails = (id) => {
    navigate(`/manage?id=${id}`);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return 'badge-success';
      case 'claimed':
        return 'badge-info';
      case 'expired':
        return 'badge-warning';
      default:
        return '';
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'depositor':
        return 'badge-primary';
      case 'beneficiary':
        return 'badge-secondary';
      case 'both':
        return 'badge-accent';
      default:
        return '';
    }
  };

  return (
    <>
      <div className="alert alert-info mb-6">
        <div>
          <strong>Network:</strong> {networkInfo?.name || 'Unknown'} |
          <strong className="ml-2">Contract:</strong> {contract?.target ? `${contract.target.slice(0, 10)}...` : 'N/A'}
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl mb-4">Inheritance History</h2>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Role</span>
              </label>
              <select
                className="select select-bordered"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="depositor">Depositor</option>
                <option value="beneficiary">Beneficiary</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Status</span>
              </label>
              <select
                className="select select-bordered"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="claimed">Claimed</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Sort By</span>
              </label>
              <select
                className="select select-bordered"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="created-desc">Newest First</option>
                <option value="created-asc">Oldest First</option>
                <option value="deadline-asc">Deadline (Soon)</option>
                <option value="deadline-desc">Deadline (Late)</option>
                <option value="amount-desc">Amount (High)</option>
                <option value="amount-asc">Amount (Low)</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Start Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">End Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="alert alert-error">
              <span>Error loading history: {error}</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredAndSortedDeposits.length === 0 && (
            <div className="alert alert-info">
              <span>
                {deposits.length === 0
                  ? 'No inheritance records found. Create your first deposit to get started!'
                  : 'No inheritances match your current filters.'}
              </span>
            </div>
          )}

          {/* Deposits List */}
          {!loading && !error && filteredAndSortedDeposits.length > 0 && (
            <div className="space-y-4">
              <div className="alert alert-success">
                <span>Found {filteredAndSortedDeposits.length} inheritance{filteredAndSortedDeposits.length !== 1 ? 's' : ''}</span>
              </div>

              {filteredAndSortedDeposits.map((deposit) => (
                <div
                  key={deposit.id}
                  className="card bg-base-200 shadow-md hover:shadow-lg cursor-pointer transition-shadow"
                  onClick={() => handleViewDetails(deposit.id)}
                >
                  <div className="card-body">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="card-title text-lg">ID: {deposit.id}</h3>
                          <div className={`badge ${getStatusBadgeClass(deposit.status)}`}>
                            {deposit.status.toUpperCase()}
                          </div>
                          <div className={`badge ${getRoleBadgeClass(deposit.role)}`}>
                            {deposit.role === 'both' ? 'SELF' : deposit.role.toUpperCase()}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-semibold">Amount:</span> {deposit.amount} ETH
                          </div>
                          <div>
                            <span className="font-semibold">Deadline:</span> {deposit.deadlineFormatted}
                          </div>
                          <div>
                            <span className="font-semibold">Depositor:</span>{' '}
                            <span className="font-mono text-xs">
                              {deposit.depositor === account
                                ? 'You'
                                : `${deposit.depositor.slice(0, 6)}...${deposit.depositor.slice(-4)}`}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold">Beneficiary:</span>{' '}
                            <span className="font-mono text-xs">
                              {deposit.beneficiary === account
                                ? 'You'
                                : `${deposit.beneficiary.slice(0, 6)}...${deposit.beneficiary.slice(-4)}`}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2">
                          <a
                            href={`https://sepolia.etherscan.io/tx/${deposit.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link link-primary text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View on Etherscan
                          </a>
                        </div>
                      </div>

                      <div className="text-right">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(deposit.id);
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
