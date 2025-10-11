# Changelog

## v1.1.5

[Unreleased]

- Fixed `$lookup` operator and other field-adding aggregation stages not working correctly when used without prepagination. The fix ensures that stages like `$lookup`, `$unwind`, `$group`, `$project`, and `$addFields` are executed within the facet docs branch, while filtering stages like `$match` are optimized by being moved before the facet for better performance.

## v1.1.4

[2025-02-17]

- Optimizes the aggregation pipeline generated while using facet by moving the shared pipeline stages above the facet stage which were earlier duplicated

## v1.1.3

[2025-01-23]

- Added prepaginate string support for TypeScript

## v1.1.2

[2024-07-23]

- Fix for #63, #60

## v1.1.1

[2024-07-05]

- Added match stage before facet to improve performance.

## v1.1.0

[2024-06-24]

- Added Support for prepagination.
- Added TS Files.
