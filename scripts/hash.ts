import * as bcrypt from 'bcryptjs';

const plain = process.argv[2];
if (!plain) {
  console.error('usage: npm run hash -- "your-password"');
  process.exit(1);
}
console.log(bcrypt.hashSync(plain, 10));
