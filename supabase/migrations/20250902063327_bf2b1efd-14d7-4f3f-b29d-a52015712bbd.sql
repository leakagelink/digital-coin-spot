
-- Allow admins to insert positions for any user
CREATE POLICY "Admins can insert positions for any user" 
ON portfolio_positions 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- Allow admins to update positions for any user  
CREATE POLICY "Admins can update positions for any user"
ON portfolio_positions 
FOR UPDATE 
USING (is_admin(auth.uid()));

-- Allow admins to delete positions for any user
CREATE POLICY "Admins can delete positions for any user"
ON portfolio_positions 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Also allow admins to insert trades for any user
CREATE POLICY "Admins can insert trades for any user"
ON trades 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- Allow admins to insert transactions for any user
CREATE POLICY "Admins can insert transactions for any user"
ON transactions 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));
