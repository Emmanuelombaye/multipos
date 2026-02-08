import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../db/supabase.js';

export const register = async (name, email, password, role = 'cashier', branchId = null) => {
  try {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      const error = new Error('User already exists');
      error.status = 409;
      throw error;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email,
        password_hash: hashedPassword,
        role,
        branch_id: branchId,
      })
      .select()
      .single();

    if (error) throw error;

    return user;
  } catch (error) {
    throw error;
  }
};

export const login = async (email, password) => {
  try {
    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }

    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branchId: user.branch_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role, branchId: user.branch_id } };
  } catch (error) {
    throw error;
  }
};
