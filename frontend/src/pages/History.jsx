import { useState, useMemo } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { usePublicClient } from 'wagmi';
import { useInheritanceHistory } from '../hooks/useInheritanceHistory';

export function History() {
  const { contractAddress, account, networkInfo } = useOutletContext();
  const publicClient = usePublicClient();
  const navigate = useNavigate();
  const { deposits, loading, error } = useInheritanceHistory(contractAddress, publicClient, account, networkInfo);

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
      case 'reclaimed':
        return 'badge-secondary';
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
      <div className="alert alert-info shadow-smooth mb-8 border-l-4 border-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div className="font-medium">
          <strong>Network:</strong> {networkInfo?.name || 'Unknown'} | <strong>Contract:</strong> <span className="font-mono">{contractAddress ? `${contractAddress.slice(0, 10)}...${contractAddress.slice(-8)}` : 'N/A'}</span>
        </div>
      </div>

      <div className="glass-card shadow-smooth-xl rounded-2xl">
        <div className="card-body p-8">
          <h2 className="card-title text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Inheritance History
          </h2>
          <p className="text-sm opacity-70 mb-6">View and filter all your inheritance transactions</p>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Role</span>
              </label>
              <select
                className="select select-bordered focus:ring-2 focus:ring-primary focus:outline-none transition-all"
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
                <span className="label-text font-semibold">Status</span>
              </label>
              <select
                className="select select-bordered focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="claimed">Claimed</option>
                <option value="reclaimed">Reclaimed</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Sort By</span>
              </label>
              <select
                className="select select-bordered focus:ring-2 focus:ring-primary focus:outline-none transition-all"
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
                <span className="label-text font-semibold">Start Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">End Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="alert alert-error shadow-smooth">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Error loading history: {error}</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredAndSortedDeposits.length === 0 && (
            <div className="alert alert-info shadow-smooth">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="font-medium">
                {deposits.length === 0
                  ? 'No inheritance records found. Create your first deposit to get started!'
                  : 'No inheritances match your current filters.'}
              </span>
            </div>
          )}

          {/* Deposits List */}
          {!loading && !error && filteredAndSortedDeposits.length > 0 && (
            <div className="space-y-4">
              <div className="alert alert-success shadow-smooth">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Found {filteredAndSortedDeposits.length} inheritance{filteredAndSortedDeposits.length !== 1 ? 's' : ''}</span>
              </div>

              {filteredAndSortedDeposits.map((deposit) => (
                <div
                  key={deposit.id}
                  className="glass-card shadow-smooth-lg hover:shadow-smooth-xl cursor-pointer transition-all rounded-xl border border-base-300 dark:border-gray-600"
                  onClick={() => handleViewDetails(deposit.id)}
                >
                  <div className="card-body p-6">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <h3 className="card-title text-xl font-bold">ID: {deposit.id}</h3>
                          <div className={`badge ${getStatusBadgeClass(deposit.status)} badge-lg font-semibold shadow-smooth`}>
                            {deposit.status.toUpperCase()}
                          </div>
                          <div className={`badge ${getRoleBadgeClass(deposit.role)} badge-lg font-semibold shadow-smooth`}>
                            {deposit.role === 'both' ? 'SELF' : deposit.role.toUpperCase()}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Amount:</span>
                            <span className="font-mono font-bold text-primary">{deposit.amount} ETH</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Deadline:</span>
                            <span className="opacity-90">{deposit.deadlineFormatted}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Depositor:</span>
                            <span className="font-mono text-xs opacity-90">
                              {deposit.depositor === account
                                ? 'You'
                                : `${deposit.depositor.slice(0, 6)}...${deposit.depositor.slice(-4)}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Beneficiary:</span>
                            <span className="font-mono text-xs opacity-90">
                              {deposit.beneficiary === account
                                ? 'You'
                                : `${deposit.beneficiary.slice(0, 6)}...${deposit.beneficiary.slice(-4)}`}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <a
                            href={`${networkInfo?.explorer}/tx/${deposit.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link link-primary text-xs font-medium hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View on Explorer →
                          </a>
                        </div>
                      </div>

                      <div className="text-right">
                        <button
                          className="btn btn-sm btn-primary font-semibold shadow-smooth hover:shadow-smooth-lg transition-all"
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
