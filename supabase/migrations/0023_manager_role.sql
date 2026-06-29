-- Migration 0023: Add manager role enum value (must be committed before use)

alter type user_role add value if not exists 'manager';
