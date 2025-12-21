export const DepositFormFields = ({ beneficiary, amount, days, onChange, disabled }) => {
  return (
    <>
      <div className="form-control">
        <label className="label" htmlFor="beneficiary">
          <span className="label-text font-semibold text-base">Beneficiary Address:</span>
        </label>
        <input
          id="beneficiary"
          type="text"
          value={beneficiary}
          onChange={(e) => onChange('beneficiary', e.target.value)}
          placeholder="0x..."
          className="input input-bordered w-full focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          required
          disabled={disabled}
        />
      </div>
      <div className="form-control">
        <label className="label" htmlFor="amount">
          <span className="label-text font-semibold text-base">Amount:</span>
        </label>
        <input
          id="amount"
          type="number"
          step="0.001"
          value={amount}
          onChange={(e) => onChange('amount', e.target.value)}
          placeholder="0.1"
          className="input input-bordered w-full focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          required
          disabled={disabled}
        />
      </div>
      <div className="form-control">
        <label className="label" htmlFor="days">
          <span className="label-text font-semibold text-base">Lock Period (days):</span>
        </label>
        <input
          id="days"
          type="number"
          value={days}
          onChange={(e) => onChange('days', e.target.value)}
          placeholder="30"
          className="input input-bordered w-full focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          required
          disabled={disabled}
        />
      </div>
    </>
  );
};
