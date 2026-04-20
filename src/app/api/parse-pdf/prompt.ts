export const RECONCILE_PROMPT = `You are reading a Brazilian payment MDR proposal.

Your task:
1. Read the anticipation rate (Acréscimo / Antecipação) in the header text if present.
   Output: METADATA: anticipation_rate=X.XX includes_anticipation=true|false chargeback_fee=X.XX confidence=0-100

2. Read every row of the MDR table from 1x to 12x. For each row, output exactly:
ROW 1: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX
ROW 2: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX
...
ROW 12: visa=X.XX master=X.XX elo=X.XX amex=X.XX hiper=X.XX

Rules:
- Use the actual decimal NUMBER visible in the cell (e.g. 2.69, not 0)
- If you cannot read a number clearly, write null — DO NOT write 0
- If a column does not exist, write null for all its rows
- If Amex and Hipercard share one column, write the same value for both`;
