-- Add permission for managers to assign cashiers
-- Add can_assign_cashier column to user_permissions if manager can assign cashiers

-- Create a permission for manager to assign cashiers
-- We use the existing user_permissions table to track this

-- First check and add returns/invoice_templates tables to the backup
-- Also add manager permission tracking