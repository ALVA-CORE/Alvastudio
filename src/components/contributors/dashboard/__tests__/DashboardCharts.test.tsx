import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardCharts } from "@/components/contributors/dashboard/DashboardCharts";

const pay = {
  unpaid_kobo: 120000,
  payout_minimum_kobo: 500000,
  next_run_kobo: 0,
  to_minimum_kobo: 380000,
  next_pay_day: "2026-11-22",
  narration_rate_per_minute_kobo: 5000,
  narration_rate_changed_at: "2026-11-16T23:00:00Z",
  earlier_narration_rate_per_hour_kobo: 500000,
};

describe("DashboardCharts pay slide", () => {
  /* Read from the API, never typed in: it changed on 17 Nov. */
  it("shows narration pay per minute, and the earlier rate once", () => {
    render(<DashboardCharts pay={pay} />);

    expect(screen.getByText(/Narration: ₦50 per minute of\s+speech/)).toBeInTheDocument();
    expect(screen.getAllByText(/₦5,000 an hour/)).toHaveLength(1);
  });

  it("follows the rate the API sends", () => {
    render(<DashboardCharts pay={{ ...pay, narration_rate_per_minute_kobo: 8333 }} />);
    expect(screen.getByText(/₦83\.33 per minute/)).toBeInTheDocument();
  });
});
