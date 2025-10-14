import { useState } from 'react';
import { ethers } from 'ethers';

export const InheritanceManager = ({ contract, account }) => {
  const [inheritanceId, setInheritanceId] = useState('');
  const [inheritanceData, setInheritanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newDays, setNewDays] = useState('30');

  const loadInheritance = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!contract) {
        throw new Error('Contract not initialized');
      }

      const data = await contract.getInheritance(inheritanceId);

      setInheritanceData({
        depositor: data[0],
        beneficiary: data[1],
        amount: ethers.formatEther(data[2]),
        deadline: new Date(Number(data[3]) * 1000).toLocaleString(),
        deadlineTimestamp: Number(data[3]),
        claimed: data[4],
      });
    } catch (err) {
      console.error('Load error:', err);
      setError(err.message || 'Failed to load inheritance');
      setInheritanceData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const tx = await contract.claim(inheritanceId);
      await tx.wait();
      setSuccess('Successfully claimed funds!');
      loadInheritance();
    } catch (err) {
      console.error('Claim error:', err);
      setError(err.message || 'Failed to claim');
    } finally {
      setLoading(false);
    }
  };

  const handleReclaim = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const tx = await contract.reclaim(inheritanceId);
      await tx.wait();
      setSuccess('Successfully reclaimed funds!');
      loadInheritance();
    } catch (err) {
      console.error('Reclaim error:', err);
      setError(err.message || 'Failed to reclaim');
    } finally {
      setLoading(false);
    }
  };

  const handleExtend = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const newDeadline = Math.floor(Date.now() / 1000) + parseInt(newDays) * 24 * 60 * 60;
      const tx = await contract.extendDeadline(inheritanceId, newDeadline);
      await tx.wait();
      setSuccess('Successfully extended deadline!');
      loadInheritance();
    } catch (err) {
      console.error('Extend error:', err);
      setError(err.message || 'Failed to extend deadline');
    } finally {
      setLoading(false);
    }
  };

  const canClaim = inheritanceData &&
    !inheritanceData.claimed &&
    inheritanceData.beneficiary.toLowerCase() === account?.toLowerCase() &&
    Date.now() / 1000 >= inheritanceData.deadlineTimestamp;

  const canReclaim = inheritanceData &&
    !inheritanceData.claimed &&
    inheritanceData.depositor.toLowerCase() === account?.toLowerCase() &&
    Date.now() / 1000 < inheritanceData.deadlineTimestamp;

  const canExtend = inheritanceData &&
    !inheritanceData.claimed &&
    inheritanceData.depositor.toLowerCase() === account?.toLowerCase();

  return (
    <div className="card">
      <h2>Manage Inheritance</h2>
      <div className="form-group">
        <label>Inheritance ID:</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="number"
            value={inheritanceId}
            onChange={(e) => setInheritanceId(e.target.value)}
            placeholder="0"
            disabled={loading}
          />
          <button onClick={loadInheritance} disabled={loading || !inheritanceId}>
            Load
          </button>
        </div>
      </div>

      {inheritanceData && (
        <div className="inheritance-details">
          <h3>Details</h3>
          <p><strong>Depositor:</strong> {inheritanceData.depositor}</p>
          <p><strong>Beneficiary:</strong> {inheritanceData.beneficiary}</p>
          <p><strong>Amount:</strong> {inheritanceData.amount} ETH</p>
          <p><strong>Deadline:</strong> {inheritanceData.deadline}</p>
          <p><strong>Status:</strong> {inheritanceData.claimed ? 'Claimed' : 'Active'}</p>

          <div className="actions">
            {canClaim && (
              <button onClick={handleClaim} disabled={loading}>
                Claim Funds
              </button>
            )}
            {canReclaim && (
              <button onClick={handleReclaim} disabled={loading}>
                Reclaim Funds
              </button>
            )}
            {canExtend && (
              <div className="extend-section">
                <label>Extend by (days):</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="number"
                    value={newDays}
                    onChange={(e) => setNewDays(e.target.value)}
                    placeholder="30"
                    disabled={loading}
                  />
                  <button onClick={handleExtend} disabled={loading}>
                    Extend Deadline
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
    </div>
  );
};
