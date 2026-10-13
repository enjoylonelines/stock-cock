# Stock-cock local UI capture

`stock-cock-local-ui-flow.gif` and `stock-cock-local-ui-flow.mp4` are browser recordings of the application running against a local Supabase instance.

- Flow: local sign-in → current inventory home → transaction history.
- Fixture: a dedicated local capture user, one warehouse, one product option, and two pre-seeded transactions (inbound and outbound).
- The recording does not submit a stock mutation. It only navigates and reads the fixture already present in the local database.

The capture demonstrates the implemented UI path only. It is not production data, production-user behaviour, a live operational write, or evidence for the separate ERP Lab performance experiment.
