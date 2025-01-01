const User = require('../models/User'); // Import the User model

async function handleCheckReferralsCommand(ctx) {
  const userId = ctx.from.id;

  // Find the user in the database
  const user = await User.findOne({ telegramId: userId });

  if (!user) {
    return ctx.reply('⚠️ You need to create a wallet first using the /wallet command.');
  }

  // Find all users referred by this user
  const referrals = await User.find({ referrerId: userId });

  // Calculate total volume and total earned from referrals
  const totalVolume = referrals.reduce((sum, referral) => sum + referral.paidVolume, 0);
  const totalEarned = referrals.reduce((sum, referral) => sum + referral.feesEarned, 0);
  const referralCount = referrals.length;

  // Send the response back to the user
  ctx.reply(`📊 Referral Summary:\n` +
             `Total Referrals: ${referralCount}\n` +
             `Total Volume of Referrals: ${totalVolume} SOL\n` +
             `Total Earned from Referrals: ${totalEarned} SOL`);
}

module.exports = { handleCheckReferralsCommand };
