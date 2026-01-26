-- Add admin SELECT policy for profiles table
-- This allows admins to view all profiles for user management
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin());

-- Add admin UPDATE policy for profiles table
-- This allows admins to update any profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.is_admin());

-- Add admin DELETE policy for profiles table
-- This allows admins to delete profiles if needed
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (public.is_admin());