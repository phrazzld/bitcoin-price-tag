# T038 - Implement API Response Validation in api.ts

## Objective
Add comprehensive validation to the CoinDesk API response before parsing to prevent runtime errors from malformed data.

## Implementation Approach

1. **Review Current API Response Handling**
   - Examine the fetchBtcPrice function in api.ts
   - Identify where response data is accessed without validation

2. **Implement Validation Checks**
   - Validate the response structure exists
   - Check that response.bpi exists and is an object
   - Validate that response.bpi.USD exists and is an object
   - Ensure response.bpi.USD.rate_float is present and is a number
   - Validate that response.time exists with proper timestamp fields

3. **Error Handling**
   - Create specific error for invalid API response structure
   - Throw meaningful errors when validation fails
   - Ensure errors are properly logged

4. **Type Safety**
   - Create a type guard function to validate CoinDesk API response
   - Ensure types are properly narrowed after validation

## Testing
- Test with valid API responses
- Test with missing or malformed response fields
- Test with non-numeric rate_float values
- Verify proper error messages for each validation failure