const Admin = require('../models/Admin');

const seedAdmin = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL || 'admin@staysync.com' });
    
    if (existingAdmin) {
      console.log('Admin already exists');
      return;
    }

    // Create default admin
    const admin = new Admin({
      email: process.env.ADMIN_EMAIL || 'admin@staysync.com',
      password: process.env.ADMIN_PASSWORD || 'admin123'
    });

    await admin.save();
    console.log('Default admin created successfully');
    console.log('Email:', admin.email);
    console.log('Password:', process.env.ADMIN_PASSWORD || 'admin123');
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
};

module.exports = seedAdmin;
