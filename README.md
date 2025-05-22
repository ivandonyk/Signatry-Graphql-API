#### - Database Utility Functions

* `get_latest_close_prices()`  
  This will return a table with columns `investment_id` and `close_price`, where `close_price` is the latest unit price for that investment.  
  
* `get_fund_invested_balance(fund_id)`  
  This will return a NUMERIC value representing the total dollar amount present in all of a fund's investments. It is the sum of `units * latestUnitPrice` for each `fundInvestment` related to `fund_id`.

* `get_fund_cash_balance(fund_id)`  
  This will return a NUMERIC value representing the total dollar amount 'in cash' for this fund. It is the sum of all transactions with a status of `READY_FOR_DIVESTMENT` or `READY_FOR_PAYMENT`. This includes contribution transactions that have not yet been invested, and divested grant transactions that have not yet been paid.

* `get_fund_amount_pending_incoming(fund_id)`  
  This will return a NUMERIC value representing the total dollar amount incoming to `fund_id`. This includes transaction with the following statuses: `PENDING`, `READY_FOR_PAYOUT`, `PENDING_PAYOUT`, `PENDING_BANK_RECONCILIATION`.

* `get_fund_amount_pending_outgoing(fund_id)`  
  This will return a NUMERIC value representing the total dollar amount outgoing from `fund_id`. This includes transaction with the following statuses: `SPECIAL_APPROVAL`, `DUE_DILIGENCE_AND_VETTING`, `FINANCIAL_REVIEW`, `READY_FOR_DIVESTMENT`, `READY_FOR_PAYMENT`.



* `get_user_profile_tsvector(user_profile_id)`  
  This will return a TSVECTOR for user search containing first name, last name, role, email addresses, and fund names.

#### - Database Trigger Functions

|Trigger|Function|Description|
|----|----|----|
|`AFTER INSERT ON investment_unit_price_history`|`investment_unit_price_history_insert()`|Recalculate `fund.investedBalance` for all funds|
|`AFTER INSERT OR UPDATE ON fund_transaction_detail`|`fund_transaction_detail_update()`|If `fundTransactionDetail` status has changed to `INVESTED` or `READY_FOR_PAYMENT`, add the `transactionDetail.units` to the `fundInvestment.units` total|
|`AFTER INSERT OR UPDATE ON fund_transaction`|`fund_transaction_update()`|If `fundTransaction` status has changed to `READY_FOR_INVESTMENT`, `INVESTED`, `READY_FOR_PAYMENT` or `PAYMENT_SENT`, update `fund.investedBalance` and `fund.cashBalance` for the related fund
|`BEFORE INSERT OR UPDATE ON fund_transaction`|`update_fund_transaction_tsvector()`|When a `fundTransaction` is created or updated, regenerate the `fund_transaction.search_vector` column|
|`BEFORE INSERT OR UPDATE ON user_profile`|`user_profile_insert_update()`|When a `userProfile` is created or updated, regenerate the `user_profile.search_vector` column|
|`AFTER UPDATE ON user_profile_role`|`user_profile_role_update()`|When a `userProfileRole` is updated, regenerate the `user_profile.search_vector` column|
|`AFTER INSERT OR UPDATE ON user_profile_email`|`user_profile_email_insert_update()`|When a `userProfileEmail` is created or updated, regenerate the `user_profile.search_vector` column|