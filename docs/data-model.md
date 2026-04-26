# YieldLens Data Model: Design and Normalisation

## Modelling Approach

<!-- User: cite Chen (1976) for ER origin, state UML multiplicity notation, justify by module organiser preference (Topic 6), levels: conceptual → logical → physical -->

## Entity Catalogue

### location

<!-- Ralph will populate in US-002 -->

### property

### transaction

### rental_index

### hpi_index

### crime_stat

### mortgage_product

### investor_scenario

## Functional Dependency Analysis

<!-- User: explicit FDs for transaction, show transitive dependency via property → location -->

## Normalisation Walkthrough

### 1NF Check

<!-- User: confirm atomic values, unique rows, no repeating groups -->

### 2NF Check

<!-- User: confirm no partial dependencies (surrogate keys make 2NF automatic) -->

### 3NF Check

<!-- User: show transitive dependency on transaction.outcode -->

### BCNF Check

<!-- User: confirm every non-trivial FD has superkey on LHS, show one example -->

## Controlled Denormalisation

<!-- User: acknowledge 3NF violation for transaction.outcode, justify with quantitative argument, document integrity trigger -->

## Indexing Strategy

<!-- Ralph will populate in US-002 -->
