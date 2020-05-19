import { Web3Manager } from './modules/Web3Manager';
import { FundsModuleApi } from './modules/FundsModuleApi';
import { LoanModuleApi } from './modules/LoanModuleApi';
import { LiquidityModuleApi } from './modules/LiquidityModuleApi';
import { TokensApi } from './modules/TokensApi';
import { TransactionsApi } from './modules/TransactionsApi';
import { SwarmApi } from './modules/SwarmApi';
import { CurveModuleApi } from './modules/CurveModuleApi';
import { DefiModuleApi } from './modules/DefiModuleApi';
import { FlashLoanApi } from './modules/FlashLoanApi';

export class Api {
  public web3Manager = new Web3Manager();
  public swarmApi = new SwarmApi();

  public transactions = new TransactionsApi();
  public tokens = new TokensApi(this.web3Manager, this.transactions);

  public flashLoanModule = new FlashLoanApi(this.web3Manager);
  public curveModule = new CurveModuleApi(this.web3Manager);
  public fundsModule = new FundsModuleApi(this.web3Manager, this.curveModule, this.tokens);
  public defiModule = new DefiModuleApi(this.web3Manager, this.transactions);
  public loanModule = new LoanModuleApi(
    this.web3Manager,
    this.tokens,
    this.transactions,
    this.fundsModule,
    this.swarmApi,
    this.curveModule,
  );

  public liquidityModule = new LiquidityModuleApi(
    this.web3Manager,
    this.tokens,
    this.transactions,
    this.fundsModule,
    this.curveModule,
  );

  constructor() {
    this.fundsModule.setTotalLProposalGetter(this.loanModule.getTotalLProposals$);
    this.fundsModule.setUnpaidInterestGetter(this.loanModule.getUnpaidInterest$);
    this.tokens.setEvents({
      forReloadPtkDistributionBalance: [
        this.loanModule.readonlyContracts.proposals.events.DebtProposalExecuted(),
      ],
    });
  }
}
