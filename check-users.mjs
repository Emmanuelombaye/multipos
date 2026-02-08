
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
// Also try backend/.env
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    let output = '🔍 Checking Users in Database...\n\n';

    const { data: users, error } = await supabase
        .from('users')
        .select(`
        id,
        name,
        email,
        role,
        branch_id,
        status,
        password_hash,
        created_at
    `);

    if (error) {
        output += 'Error fetching users: ' + error.message + '\n';
    } else if (!users || users.length === 0) {
        output += '❌ No users found in the database.\n';
    } else {
        output += '✅ Found ' + users.length + ' users:\n\n';

        // Get branches to map names
        const { data: branches } = await supabase.from('branches').select('id, name');
        const branchMap = {};
        if (branches) {
            branches.forEach(b => branchMap[b.id] = b.name);
        }

        // Format as table manually
        output += 'Name'.padEnd(20) + 'Email'.padEnd(30) + 'Role'.padEnd(10) + 'Branch'.padEnd(25) + 'Status\n';
        output += '-'.repeat(95) + '\n';

        users.forEach(u => {
            const branchName = branchMap[u.branch_id] || u.branch_id || 'None';
            output += (u.name || '').padEnd(20) + (u.email || '').padEnd(30) + (u.role || '').padEnd(10) + String(branchName).substring(0, 24).padEnd(25) + (u.status || '') + '\n';
        });
    }

    output += '\n------------------------------------------------\n';
    output += '💡 EXPECTED CREDENTIALS FROM SEED.JS:\n';
    output += '   cashier@tamasha.com  / @Kenya90!\n';
    output += '   cashier@reem.com     / @Kenya80!\n';
    output += '   cashier@msabweni.com / @Kenya70!\n';
    output += '------------------------------------------------\n';
    output += '💡 EXPECTED CREDENTIALS FROM SEED-REALISTIC.JS:\n';
    output += '   alice.cashier@example.com / password123\n';
    output += '------------------------------------------------\n';
    output += '💡 LOGIN SCREEN HINT:\n';
    output += '   cashier@example.com / password123\n';
    output += '------------------------------------------------\n';

    const hintUser = users?.find(u => u.email === 'cashier@example.com');
    if (!hintUser) {
        output += '⚠️ WARNING: The user shown in the Login Screen (cashier@example.com) DOES NOT EXIST in the database!\n';
        output += '   You cannot login with that email.\n';
    } else {
        output += '✅ User cashier@example.com exists.\n';
        output += '   Assigned Branch: ' + (hintUser.branch_id || 'None') + '\n';

        // Check password
        try {
            const isMatch = await bcrypt.compare('password123', hintUser.password_hash);
            if (isMatch) {
                output += '✅ Password "password123" is CORRECT.\n';
            } else {
                output += '❌ Password "password123" is INCORRECT!\n';
                output += '   This explains why login is failing. The seed data might have used a different password.\n';
            }
        } catch (e) {
            output += '❌ Error checking password: ' + e.message + '\n';
        }
    }

    fs.writeFileSync('users_report.txt', output, 'utf8');
}

checkUsers();
