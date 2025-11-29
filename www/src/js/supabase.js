
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mxxrymqwkxxtvxsgkyil.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14eHJ5bXF3a3h4dHZ4c2dreWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjAzNjgsImV4cCI6MjA3OTg5NjM2OH0.Z2kJCeypENzxwWfwCdO3eRspKgslJswNzi_h8gtdQJE'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Connection failed:', error);
    } else {
        console.log('Connected successfully:', data);
    }
}

testConnection();