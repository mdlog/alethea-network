// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Custom GraphQL input types for ApplicationId and Amount
//! These types allow GraphQL to accept String inputs and convert them to proper types

use async_graphql::{InputType, InputValueError, InputValueResult, Scalar, ScalarType, Value};
use linera_sdk::linera_base_types::{ApplicationId, Amount};
use std::str::FromStr;

/// Custom GraphQL scalar for ApplicationId that accepts String input
#[derive(Debug, Clone)]
pub struct ApplicationIdInput(pub ApplicationId);

#[Scalar]
impl ScalarType for ApplicationIdInput {
    fn parse(value: Value) -> InputValueResult<Self> {
        match value {
            Value::String(s) => {
                let app_id = ApplicationId::from_str(&s)
                    .map_err(|e| InputValueError::custom(format!("Invalid ApplicationId: {}", e)))?;
                Ok(ApplicationIdInput(app_id))
            }
            _ => Err(InputValueError::expected_type(value)),
        }
    }

    fn to_value(&self) -> Value {
        Value::String(format!("{:?}", self.0))
    }
}

impl From<ApplicationIdInput> for ApplicationId {
    fn from(input: ApplicationIdInput) -> Self {
        input.0
    }
}

impl From<ApplicationId> for ApplicationIdInput {
    fn from(app_id: ApplicationId) -> Self {
        ApplicationIdInput(app_id)
    }
}

/// Custom GraphQL scalar for Amount that accepts String input
#[derive(Debug, Clone)]
pub struct AmountInput(pub Amount);

#[Scalar]
impl ScalarType for AmountInput {
    fn parse(value: Value) -> InputValueResult<Self> {
        match value {
            Value::String(s) => {
                let amount = Amount::from_str(&s)
                    .map_err(|e| InputValueError::custom(format!("Invalid Amount: {}", e)))?;
                Ok(AmountInput(amount))
            }
            _ => Err(InputValueError::expected_type(value)),
        }
    }

    fn to_value(&self) -> Value {
        Value::String(self.0.to_string())
    }
}

impl From<AmountInput> for Amount {
    fn from(input: AmountInput) -> Self {
        input.0
    }
}

impl From<Amount> for AmountInput {
    fn from(amount: Amount) -> Self {
        AmountInput(amount)
    }
}

