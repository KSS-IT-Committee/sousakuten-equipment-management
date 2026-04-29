# Database

## 1. Equipments

| id | name | quantity | picture |
| --- | --- | --- | --- |
| 1 |  Equipment 1 | 5 | ![Equipment 1](https://via.placeholder.com/150) |

## 2. Borrowings

| id | equipment_id | tag_number | class | borrowed_at | returned_at |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | 3 | 11 | 2024-01-01 | 2024-01-10 |

or 

currently, the `tag_number` field is not used, so it can be omitted from the table:
| id | equipment_id | class | borrowed_at | returned_at |
| --- | --- | --- | --- | --- |
| 1 | 1 | 11 | 2024-01-01 | 2024-01-10 |
