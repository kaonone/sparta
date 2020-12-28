const Pool = artifacts.require("Pool");
const LoanModule = artifacts.require("LoanModule");
const LoanProposalsModule = artifacts.require("LoanProposalsModule");
const LoanLimitsModule = artifacts.require("LoanLimitsModule");

const POOL_ADDRESS = `0x73067fdd366Cb678E9b539788F4C0f34C5700246`;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

async function main() {
    const pool = await Pool.at(POOL_ADDRESS);
    let loanModuleAddress = await pool.get('loan', {from:ZERO_ADDRESS});
    //let loanLimitsModuleAddress = await pool.get('loan_limits');
    let loanProposalsModuleAddress = await pool.get('loan_proposals', {from:ZERO_ADDRESS});
    console.log('Loan module:', loanModuleAddress);
    console.log('Loan proposals module:', loanProposalsModuleAddress);
    const loanModule = LoanModule.at(loanModuleAddress);
    //const loanProposalsModule = LoanProposalsModule.at(loanProposalsModuleAddress);
    const loanProposalsModule = new web3.eth.Contract(LoanProposalsModule.abi, loanProposalsModuleAddress);

    let executedProposals = await loanProposalsModule.getPastEvents('DebtProposalExecuted', { fromBlock: 0, toBlock: 'latest' });
    console.log(executedProposals);



}


module.exports = async (callback) => {
    try{
        await main();
        callback();
    }catch(e){callback(e)}
}
