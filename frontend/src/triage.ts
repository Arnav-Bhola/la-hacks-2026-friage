import { useState } from "react";

export interface TriageResult {
  esi_level: number;
  severity: "critical" | "high" | "moderate" | "low" | "minimal";
  care_type: "trauma" | "emergency" | "urgent_care_er" | "urgent_care_clinic" | "primary_care";
  specialty: string;
  hospital_search_keyword: string;
  reasoning: string;
  immediate_actions: string[];
  do_not_delay_for: string[];
}

export function useTriage() {
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTriage = async (tags: { name: string }[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data: TriageResult = await res.json();
      setTriage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Triage failed");
    } finally {
      setLoading(false);
    }
  };

  return { runTriage, setTriage, triage, loading, error };
}
