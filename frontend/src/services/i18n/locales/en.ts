// tslint:disable:max-line-length
const en = {
  app: {
    mainTitle: 'Pensify',
    connectingWarning: 'You need connect to wallet',
    pages: {
      overview: {
        poolBalanceTitle: 'Input/Output costs',
        distributions: 'Distributions',
        myBalanceTitle: 'My balance',
        poolInfoTitle: 'Pool information',
      },
      balances: {
        balanceChangesTitle: 'Deposit/Withdraw history',
        earningsTitle: 'Earnings',
      },
    },
    components: {
      header: {
        apr: 'Pool APR',
        availableBalance: 'Supply',
        depositPlusWithdraw24Volume: '24 volume',
        distributed: 'Total distributed (Coming soon)',
        issued: 'Loans',
        members: 'Members',
        shares: 'Shares',
        total: 'Total',
        yield: 'Yield (Coming soon)',
      },
    },
  },
  features: {
    auth: {
      applicationNetwork: 'This application works with the network "%{networkName}"',
    },
    notifications: {
      'dai.approve': {
        pending: 'Approving %{amount} transfer. Pending',
        success: 'Approving %{amount} transfer. Successful',
        error: 'Approving %{amount} transfer. Failed',
      },
      'ptk.claimDistributions': {
        pending: 'Withdrawing distributions. Pending',
        success: 'Withdrawing distributions. Successful',
        error: 'Withdrawing distributions. Failed',
      },
      'liquidity.sellPtk': {
        pending: 'Withdrawing %{amount} from the pool. Pending',
        success: 'Withdrawing %{amount} from the pool. Successful',
        error: 'Withdrawing %{amount} from the pool. Failed',
      },
      'liquidity.buyPtk': {
        pending: 'Transferring %{amount} to the pool. Pending',
        success: 'Transferring %{amount} to the pool. Successful',
        error: 'Transferring %{amount} to the pool. Failed',
      },
      'liquidity.closePlan': {
        pending: 'Exit from the pool. Pending',
        success: 'Exit from the pool. Successful',
        error: 'Exit from the pool. Failed',
      },
      'defi.withdrawInterest': {
        pending: 'Withdrawing yield. Pending',
        success: 'Withdrawing yield. Successful',
        error: 'Withdrawing yield. Failed',
      },
      'loan.addPledge': {
        pending: 'Adding pledge for the loan. Pending',
        success: 'Adding pledge for the loan. Successful',
        error: 'Adding pledge for the loan. Failed',
      },
      'loan.unstakePledge': {
        pending: 'Withdrawing pledge from the loan. Pending',
        success: 'Withdrawing pledge from the loan. Successful',
        error: 'Withdrawing pledge from the loan. Failed',
      },
      'loan.withdrawUnlockedPledge': {
        pending: 'Withdraw unlocked stake and earn from the loan. Pending',
        success: 'Withdraw unlocked stake and earn from the loan. Successful',
        error: 'Withdraw unlocked stake and earn from the loan. Failed',
      },
      'loan.createProposal': {
        pending: 'Creating a loan proposal. Pending',
        success: 'Creating a loan proposal. Successful',
        error: 'Creating a loan proposal. Failed',
      },
      'loan.executeProposal': {
        pending: 'Loan activation. Pending',
        success: 'Loan activation. Successful',
        error: 'Loan activation. Failed',
      },
      'loan.cancelProposal': {
        pending: 'Canceling a loan proposal. Pending',
        success: 'Canceling a loan proposal. Successful',
        error: 'Canceling a loan proposal. Failed',
      },
      'loan.liquidateDebt': {
        pending: 'Loan liquidation. Pending',
        success: 'Loan liquidation. Successful',
        error: 'Loan liquidation. Failed',
      },
      'loan.repay': {
        pending: 'Loan repaying. Pending',
        success: 'Loan repaying. Successful',
        error: 'Loan repaying. Failed',
      },
      'arbitrage.swap': {
        pending: 'Swap executing. Pending',
        success: 'Swap executing. Successful',
        error: 'Swap executing. Failed',
      },
      'arbitrage.createExecutor': {
        pending: 'Arbitrage executor creating. Pending',
        success: 'Arbitrage executor creating. Successful',
        error: 'Arbitrage executor creating. Failed',
      },
      'arbitrage.approveTokens': {
        pending: 'Tokens approving for arbitrage protocols. Pending',
        success: 'Tokens approving for arbitrage protocols. Successful',
        error: 'Tokens approving for arbitrage protocols. Failed',
      },
    },
    createArbitrageExecutor: {
      confirmMessage: 'Are you sure you want to create an arbitrage executor?',
    },
    cashExchange: {
      pTokenBuying: {
        buttonTitle: 'Deposit',
        formTitle: 'Deposit',
        placeholder: 'Enter sum',
        confirmMessage: 'Are you sure you want deposit %{sourceAmount}?',
      },
      pTokenSellingButton: {
        buttonTitle: 'Withdraw',
        formTitle: 'Withdraw',
        placeholder: 'Enter sum',
        fields: {
          withdrawMethod: {
            availableBalance: 'from available pool balance',
            defiYield: 'from investment yield',
          },
        },
        confirmMessage: 'Are you sure you want withdraw %{sourceAmount}?',
        interestConfirmation:
          ' Additional ~%{interestAmount} will be deducted from your available balance as a payment for the the accumulated interest on your outstanding loans. Full amount to be written off from your available balance will be ~%{fullAmount}.',
      },
      stakeButton: {
        buttonTitle: 'Stake',
        formTitle: 'Stake',
        placeholder: 'Enter sum',
        confirmMessage:
          'Are you sure you want to stake %{sourceAmount}? Your interest share will increase by %{interestShareDelta}',
      },
      unstakeButton: {
        buttonTitle: 'Unstake',
        formTitle: 'Unstake',
        placeholder: 'Enter sum',
        confirmMessage:
          'Are you sure you want to unstake %{sourceAmount}? Your interest share will decrease by %{interestShareDelta}',
      },
      repayButton: {
        buttonTitle: 'Repay',
        formTitle: 'Repay',
        placeholder: 'Enter sum',
        confirmMessage:
          'Are you sure you want to repay %{sourceAmount}? Loan body: ~%{body}, interest: ~%{interest}',
        fields: {
          repaymentMethod: {
            fromOwnBalance: 'from own balance',
            fromAvailablePoolBalance: 'from available pool balance',
          },
        },
        insufficientBalanceError: 'Insufficient balance. You have only %{value}.',
      },
      getLoanButton: {
        buttonTitle: 'Borrow',
        formTitle: 'Get loan',
        amountPlaceholder: 'Enter sum',
        amountLabel: 'Loan sum',
        percentPlaceholder: 'Enter percent value',
        percentLabel: 'Percent',
        descriptionPlaceholder: 'Enter reason',
        descriptionLabel: 'Reason',
        confirmMessage:
          'Are you sure you want get loan %{sourceAmount} with collateral %{collateral}?',
      },
      activateLoanButton: {
        confirmMessage:
          'Are you sure you want to activate a loan? Please note that your loan will be transferred directly to your wallet.',
      },
      preliminaryExitButton: {
        button: 'Exit',
        confirmMessage:
          'Are you sure you want to preliminary exit from pension fund? You get %{exitBalance} and lose %{exitLose}',
      },
      withdrawDefiYieldButton: {
        buttonTitle: 'Withdraw',
        confirmMessage:
          'Are you sure you want to withdraw %{amount} from yield? Please note that your yield will be transferred directly to your wallet.',
      },
      cancelProposalButton: {
        confirmMessage: 'Are you sure you want to cancel a loan proposal?',
      },
      liquidateLoanButton: {
        confirmMessage: 'Are you sure you want to liquidate a loan?',
      },
      unlockButton: {
        buttonTitle: 'Unlock',
        confirmMessage:
          'Are you sure you want to withdraw unlocked stake %{pledgeForUnlock} and earn %{earnForUnlock}?',
      },
      exchangingForm: {
        cancelButtonText: 'Cancel',
        givenAmountText: 'You get ~%{formattedAmount}',
        targetAmountError: 'Please wait until amount is calculated',
      },
      exchangingConfirmation: {
        title: 'Confirm action',
        no: 'no',
        yes: 'yes',
      },
    },
    personalInformation: {
      deposit: 'Deposit',
      availableBalance: 'Available balance',
      currentProfit: 'Profit',
      defiYield: 'Yield',
      locked: 'Locked',
      credit: 'Current loans',
    },
    distributions: {
      claimsList: {
        notFound: 'Claims not found',
        date: 'Date',
        address: 'Address',
        claimed: 'Claimed',
      },
      eventsList: {
        notFound: 'Distributions not found',
        date: 'Date',
        distribution: 'Distribution',
        claimed: 'Claimed',
        members: 'Members',
        showClaimsButton: 'Show claims',
      },
      accumulated: 'Accumulated',
      untilTheNextDistribution: 'Time to Next Distribution',
      awaitingDistribution: 'Awaiting distribution',
      withdrawButton: 'Withdraw my distributions',
      withdrawConfirmationMessage:
        'Are you sure you want to withdraw %{distributions} from distributions? This happens automatically when you change your balance.',
    },
    networkWarning: {
      title: 'You are connected to the wrong network',
      warning:
        'You are connected to the wrong network. Please choose %{name} to proceed to %{type}',
      disconnectButton: 'Disconnect',
      networkName: {
        1: 'Main Ethereum Network',
        4: 'Rinkeby Network',
        42: 'Kovan Network',
      },
      networkType: {
        1: 'mainnet',
        4: 'testnet',
        42: 'testnet',
      },
    },
    balance: {
      changes: {
        notFound: 'Balance changes not found',
        date: 'Date',
        type: 'Action',
        amount: 'Amount',
        types: {
          DEPOSIT: 'Deposit',
          WITHDRAW: 'Withdraw',
        },
      },
      earnings: {
        notFound: 'Earnings not found',
        date: 'Date',
        type: 'Type',
        amount: 'Amount',
        types: {
          DEBT_INTEREST: 'Loan interest',
          POOL_DISTRIBUTIONS: 'Pool distribution',
        },
      },
    },
    loans: {
      loansList: {
        myLoans: 'My loans',
        myGuarantees: 'My guarantees',
        others: 'Others',
      },
      loansPanel: {
        notFound: 'Loans not found',
        address: 'Address',
        loan: 'Loan',
        duePayment: 'Due payment',
        borrowApr: 'Borrow APR',
        earn: 'Earn',
        status: 'Status',
        myStake: 'My stake',
        myInterestShare: 'Interest share',
        paymentDate: 'Payment date',
        statuses: {
          PROPOSED: '%{pledgeProgress}% staked',
          EXECUTED: 'executed',
          PARTIALLY_REPAYED: 'partially repayed',
          CLOSED: 'closed',
        },
      },
    },
    loanApplications: {
      notFound: 'Loan applications not found',
      lend: 'lend',
      to: 'to',
      apr: 'apr',
      myStake: 'My stake',
      collateral: 'Collateral',
      timeLeft: 'Time left',
      expansionPanelTitle: 'Reason',
      status: {
        PROPOSED: 'proposed',
        APPROVED: 'approved',
        DECLINED: 'declined',
        PARTIALLY_REPAYED: 'partially repayed',
        CLOSED: 'closed',
      },
    },
  },
  utils: {
    validation: {
      isRequired: 'Field is required',
      moreThen: 'Should be more then %{value}',
      moreThenOrEqual: 'Should be more then or equal %{value}',
      lessThenOrEqual: 'Should be less then or equal %{value}',
      notDefault: 'Value must be different from initial',
      maxStringLength: 'Text should be less then %{max} letters',
      onEnglishPlease: 'Should contain only english letters, numbers and ",.!:\'""',
      isNumber: 'Enter a valid number',
      decimalsMoreThen: 'Enter a valid number with decimals less than %{decimals} digits',
      mustBeAnInteger: 'Enter an integer',
      isPositiveNumber: 'Must be positive number',
    },
  },
  components: {
    pagination: {
      itemsPerPage: 'Items per page',
      currentPagination: '%{from} - %{to} of %{total}',
      currentSubgraphPagination: '%{from} - %{to}',
    },
    activitiesCard: {
      expansionPanelTitle: 'Reason',
    },
  },
};

export { en };
