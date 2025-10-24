import { useState } from 'react';
import { ethers } from 'ethers';

export const DepositForm = ({ contract, account }) => {
  const [beneficiary, setBeneficiary] = useState('');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleDeposit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!contract) {
        throw new Error('Contract not initialized');
      }

      if (!ethers.isAddress(beneficiary)) {
        throw new Error('Invalid beneficiary address');
      }

      const deadline = Math.floor(Date.now() / 1000) + parseInt(days) * 24 * 60 * 60;
      const value = ethers.parseEther(amount);

      const tx = await contract.deposit(beneficiary, deadline, { value });
      const receipt = await tx.wait();

      // Get inheritance ID from event
      const event = receipt.logs.find(
        (log) => log.topics[0] === contract.interface.getEvent('InheritanceCreated').topicHash
      );

      let inheritanceId = 'unknown';
      if (event) {
        const parsedLog = contract.interface.parseLog(event);
        inheritanceId = parsedLog.args.inheritanceId.toString();
      }

      setSuccess(`Successfully deposited! Inheritance ID: ${inheritanceId}`);
      setBeneficiary('');
      setAmount('');
      setDays('30');
    } catch (err) {
      console.error('Deposit error:', err);
      setError(err.message || 'Failed to deposit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-2xl">Create Inheritance</h2>
        <form onSubmit={handleDeposit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Beneficiary Address:</span>
            </label>
            <input
              type="text"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              placeholder="0x..."
              className="input input-bordered w-full"
              required
              disabled={loading}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Amount (ETH):</span>
            </label>
            <input
              type="number"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.1"
              className="input input-bordered w-full"
              required
              disabled={loading}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Lock Period (days):</span>
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="30"
              className="input input-bordered w-full"
              required
              disabled={loading}
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Processing...' : 'Deposit'}
          </button>
        </form>
        {error && (
          <div className="alert alert-error mt-4">
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success mt-4">
            <span>{success}</span>
          </div>
        )}
      </div>
    </div>
  );
};
