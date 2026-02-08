
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
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

async function fixUser() {
    console.log('🔧 Fixing Cashier User...\n');

    const email = 'cashier@example.com';
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

    if (fetchError || !user) {
        if (fetchError) console.error(fetchError.message);
        console.log(`❌ User ${email} not found.`);
        return;
    }

    const { error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hashedPassword })
        .eq('id', user.id);

    if (updateError) {
        console.log('❌ Failed to update password:', updateError.message);
    } else {
        console.log(`✅ Password for ${email} has been reset to "${newPassword}".`);
        console.log('👉 You should now be able to login with:');
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${newPassword}`);
    }
}

fixUser();
