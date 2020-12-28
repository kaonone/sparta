const Pool = artifacts.require("Pool");
const LoanModule = artifacts.require("LoanModule");
const LoanProposalsModule = artifacts.require("LoanProposalsModule");
const LoanLimitsModule = artifacts.require("LoanLimitsModule");

const POOL_ADDRESS = `0x73067fdd366Cb678E9b539788F4C0f34C5700246`;

async function main() {
    const pool = await Pool.at(POOL_ADDRESS);
    console.log(pool);
    let loanModuleAddress = await pool.get.request('loan');
    // let loanLimitsModuleAddress = await pool.get('loan_limits');
    // let loanProposalsModuleAddress = await pool.get('loan_proposals');
    console.log('Loan module:', loanModuleAddress);

}


module.exports = async (callback) => {
    try{
        await main();
        callback();
    }catch(e){callback(e)}
}
