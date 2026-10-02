# Marketing

Landing page for the coffee-money positioning. Checkout is optional.

## Requirements

### Requirement: Explain the wedge
The landing page SHALL state the product as proof of work for trades, SHALL show pricing of $19 per month or $99 lifetime, and SHALL contrast that with CompanyCam and a Jobber-class stack without claiming to replace scheduling or quoting.

#### Scenario: Pricing is visible
- **WHEN** a visitor opens the home page
- **THEN** they see Pro at $19/mo and Lite at $99 once

### Requirement: Checkout without secrets
The system SHALL show checkout controls, and SHALL report checkout as coming soon when Stripe keys are absent. Build and demo MUST NOT require those keys.

#### Scenario: Missing keys
- **WHEN** Stripe environment variables are empty and the visitor chooses a plan
- **THEN** the interface says checkout is coming soon and does not throw
