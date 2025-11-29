-- Create the users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    fullname VARCHAR(100),
    bio TEXT,
    status VARCHAR(20) DEFAULT 'active',
    avatar_url TEXT,
    cover_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Create an index on username for faster lookups
CREATE INDEX idx_users_username ON users(username);

-- Create an index on status for filtering
CREATE INDEX idx_users_status ON users(status);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (adjust these based on your needs)

-- Policy: Users can view all active users
CREATE POLICY "Users can view active profiles" ON users
    FOR SELECT USING (status = 'active');

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Users can insert their own profile (usually handled by triggers)
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Optional: Policy for admin users to have full access
CREATE POLICY "Admin users have full access" ON users
    FOR ALL USING (auth.jwt() ->> 'email' = 'admin@example.com');