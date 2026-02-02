// Copyright (c) Alethea Network
// SPDX-License-Identifier: MIT

//! Custom GraphQL input types for Voter Template
//! Wrapper types that implement ScalarType to support String conversion

use async_graphql::{InputValueError, InputValueResult, Scalar, ScalarType, Value};
use linera_sdk::linera_base_types::{ApplicationId, Amount};
use std::str::FromStr;

/// Wrapper for ApplicationId that implements ScalarType
/// This allows GraphQL to accept String and convert to ApplicationId
#[derive(Debug, Clone)]
pub struct ApplicationIdWrapper(pub ApplicationId);

impl From<ApplicationIdWrapper> for ApplicationId {
    fn from(wrapper: ApplicationIdWrapper) -> Self {
        wrapper.0
    }
}

impl From<ApplicationId> for ApplicationIdWrapper {
    fn from(id: ApplicationId) -> Self {
        ApplicationIdWrapper(id)
    }
}

#[Scalar(name = "ApplicationId")]
impl ScalarType for ApplicationIdWrapper {
    fn parse(value: Value) -> InputValueResult<Self> {
        match value {
            Value::String(s) => {
                ApplicationId::from_str(&s)
                    .map(ApplicationIdWrapper)
                    .map_err(|e| InputValueError::custom(format!("Invalid ApplicationId '{}': {}", s, e)))
            }
            _ => Err(InputValueError::expected_type(value)),
        }
    }

    fn to_value(&self) -> Value {
        Value::String(format!("{:?}", self.0))
    }
}

/// Wrapper for Amount that implements ScalarType
/// This allows GraphQL to accept String and convert to Amount
#[derive(Debug, Clone)]
pub struct AmountWrapper(pub Amount);

impl From<AmountWrapper> for Amount {
    fn from(wrapper: AmountWrapper) -> Self {
        wrapper.0
    }
}

impl From<Amount> for AmountWrapper {
    fn from(amount: Amount) -> Self {
        AmountWrapper(amount)
    }
}

#[Scalar(name = "Amount")]
impl ScalarType for AmountWrapper {
    fn parse(value: Value) -> InputValueResult<Self> {
        match value {
            Value::String(s) => {
                Amount::from_str(&s)
                    .map(AmountWrapper)
                    .map_err(|e| InputValueError::custom(format!("Invalid Amount '{}': {}", s, e)))
            }
            Value::Number(n) => {
                if let Some(num) = n.as_u64() {
                    Ok(AmountWrapper(Amount::from_tokens(num.into())))
                } else if let Some(num) = n.as_i64() {
                    if num >= 0 {
                        Ok(AmountWrapper(Amount::from_tokens(num as u128)))
                    } else {
                        Err(InputValueError::custom("Amount must be non-negative"))
                    }
                } else {
                    Err(InputValueError::custom("Amount must be a positive integer"))
                }
            }
            _ => Err(InputValueError::expected_type(value)),
        }
    }

    fn to_value(&self) -> Value {
        Value::String(self.0.to_string())
    }
}

