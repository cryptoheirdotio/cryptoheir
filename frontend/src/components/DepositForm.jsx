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
    <div className="card">
      <h2>Create Inheritance</h2>
      <form onSubmit={handleDeposit}>
        <div className="form-group">
          <label>Beneficiary Address:</label>
          <input
            type="text"
            value={beneficiary}
            onChange={(e) => setBeneficiary(e.target.value)}
            placeholder="0x..."
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Amount (ETH):</label>
          <input
            type="number"
            step="0.001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.1"
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Lock Period (days):</label>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="30"
            required
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Deposit'}
        </button>
      </form>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
    </div>
  );
};
