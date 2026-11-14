export type MonthlyCategory = { category: string; amount: number; color: string };
export type MonthlyFlow = { total: number; categories: MonthlyCategory[] };
export type MonthlyTransactionSummary = { spending: MonthlyFlow; income: MonthlyFlow };

// Aggregated from the CUST00001 transactions SQLite database, grouped by transaction month and amount sign.
export const monthlyTransactionSummary: Record<string, MonthlyTransactionSummary> = {
  "2024-10": {
    "spending": {
      "total": 2386.99,
      "categories": [
        {
          "category": "Lifestyle",
          "amount": 834.42,
          "color": "#d5a338"
        },
        {
          "category": "Groceries",
          "amount": 752.75,
          "color": "#008044"
        },
        {
          "category": "Housing",
          "amount": 511.9,
          "color": "#3b9b67"
        },
        {
          "category": "Invest Deposit",
          "amount": 219.64,
          "color": "#91a84c"
        },
        {
          "category": "Utilities",
          "amount": 68.28,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2280.78,
      "categories": [
        {
          "category": "Salary",
          "amount": 2280.78,
          "color": "#008044"
        }
      ]
    }
  },
  "2024-11": {
    "spending": {
      "total": 3267.57,
      "categories": [
        {
          "category": "Health",
          "amount": 1030.75,
          "color": "#76b58e"
        },
        {
          "category": "Groceries",
          "amount": 701.72,
          "color": "#008044"
        },
        {
          "category": "Housing",
          "amount": 535.2,
          "color": "#3b9b67"
        },
        {
          "category": "Lifestyle",
          "amount": 492.2,
          "color": "#d5a338"
        },
        {
          "category": "Invest Deposit",
          "amount": 236.27,
          "color": "#91a84c"
        },
        {
          "category": "Utilities",
          "amount": 140.39,
          "color": "#b45d69"
        },
        {
          "category": "Home & Tech",
          "amount": 131.04,
          "color": "#a1aaa7"
        }
      ]
    },
    "income": {
      "total": 2453.48,
      "categories": [
        {
          "category": "Salary",
          "amount": 2453.48,
          "color": "#008044"
        }
      ]
    }
  },
  "2024-12": {
    "spending": {
      "total": 2524.81,
      "categories": [
        {
          "category": "Groceries",
          "amount": 779.7,
          "color": "#008044"
        },
        {
          "category": "Health",
          "amount": 772.46,
          "color": "#76b58e"
        },
        {
          "category": "Housing",
          "amount": 511.08,
          "color": "#3b9b67"
        },
        {
          "category": "Invest Deposit",
          "amount": 205.96,
          "color": "#91a84c"
        },
        {
          "category": "Travel",
          "amount": 172.96,
          "color": "#5c8db0"
        },
        {
          "category": "Utilities",
          "amount": 82.65,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2138.72,
      "categories": [
        {
          "category": "Salary",
          "amount": 2138.72,
          "color": "#008044"
        }
      ]
    }
  },
  "2025-01": {
    "spending": {
      "total": 1766.46,
      "categories": [
        {
          "category": "Groceries",
          "amount": 647.09,
          "color": "#008044"
        },
        {
          "category": "Housing",
          "amount": 525.74,
          "color": "#3b9b67"
        },
        {
          "category": "Restaurants",
          "amount": 221.68,
          "color": "#6da8a4"
        },
        {
          "category": "Invest Deposit",
          "amount": 195.75,
          "color": "#91a84c"
        },
        {
          "category": "Utilities",
          "amount": 176.2,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2032.75,
      "categories": [
        {
          "category": "Salary",
          "amount": 2032.75,
          "color": "#008044"
        }
      ]
    }
  },
  "2025-02": {
    "spending": {
      "total": 2352.66,
      "categories": [
        {
          "category": "Groceries",
          "amount": 570.11,
          "color": "#008044"
        },
        {
          "category": "Housing",
          "amount": 536.28,
          "color": "#3b9b67"
        },
        {
          "category": "Lifestyle",
          "amount": 454.8,
          "color": "#d5a338"
        },
        {
          "category": "Health",
          "amount": 409.66,
          "color": "#76b58e"
        },
        {
          "category": "Invest Deposit",
          "amount": 245.68,
          "color": "#91a84c"
        },
        {
          "category": "Utilities",
          "amount": 136.13,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2551.15,
      "categories": [
        {
          "category": "Salary",
          "amount": 2551.15,
          "color": "#008044"
        }
      ]
    }
  },
  "2025-03": {
    "spending": {
      "total": 2617.09,
      "categories": [
        {
          "category": "Groceries",
          "amount": 863.16,
          "color": "#008044"
        },
        {
          "category": "Housing",
          "amount": 495.88,
          "color": "#3b9b67"
        },
        {
          "category": "Health",
          "amount": 424.05,
          "color": "#76b58e"
        },
        {
          "category": "Restaurants",
          "amount": 249.09,
          "color": "#6da8a4"
        },
        {
          "category": "Invest Deposit",
          "amount": 222.56,
          "color": "#91a84c"
        },
        {
          "category": "Utilities",
          "amount": 185.49,
          "color": "#b45d69"
        },
        {
          "category": "Transportation",
          "amount": 176.86,
          "color": "#8d6da8"
        }
      ]
    },
    "income": {
      "total": 2311.12,
      "categories": [
        {
          "category": "Salary",
          "amount": 2311.12,
          "color": "#008044"
        }
      ]
    }
  },
  "2025-04": {
    "spending": {
      "total": 2411.51,
      "categories": [
        {
          "category": "Health",
          "amount": 798.36,
          "color": "#76b58e"
        },
        {
          "category": "Housing",
          "amount": 535.71,
          "color": "#3b9b67"
        },
        {
          "category": "Groceries",
          "amount": 426.62,
          "color": "#008044"
        },
        {
          "category": "Transportation",
          "amount": 253.86,
          "color": "#8d6da8"
        },
        {
          "category": "Invest Deposit",
          "amount": 252.59,
          "color": "#91a84c"
        },
        {
          "category": "Utilities",
          "amount": 144.37,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2622.96,
      "categories": [
        {
          "category": "Salary",
          "amount": 2622.96,
          "color": "#008044"
        }
      ]
    }
  },
  "2025-05": {
    "spending": {
      "total": 2367.76,
      "categories": [
        {
          "category": "Housing",
          "amount": 506.92,
          "color": "#3b9b67"
        },
        {
          "category": "Entertainment",
          "amount": 383.04,
          "color": "#d17655"
        },
        {
          "category": "Health",
          "amount": 343.09,
          "color": "#76b58e"
        },
        {
          "category": "Groceries",
          "amount": 334.43,
          "color": "#008044"
        },
        {
          "category": "Transportation",
          "amount": 248.18,
          "color": "#8d6da8"
        },
        {
          "category": "Invest Deposit",
          "amount": 224.8,
          "color": "#91a84c"
        },
        {
          "category": "Lifestyle",
          "amount": 207.57,
          "color": "#d5a338"
        },
        {
          "category": "Utilities",
          "amount": 119.73,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2334.39,
      "categories": [
        {
          "category": "Salary",
          "amount": 2334.39,
          "color": "#008044"
        }
      ]
    }
  },
  "2025-06": {
    "spending": {
      "total": 2212.0,
      "categories": [
        {
          "category": "Groceries",
          "amount": 763.76,
          "color": "#008044"
        },
        {
          "category": "Housing",
          "amount": 531.56,
          "color": "#3b9b67"
        },
        {
          "category": "Entertainment",
          "amount": 403.48,
          "color": "#d17655"
        },
        {
          "category": "Invest Deposit",
          "amount": 225.35,
          "color": "#91a84c"
        },
        {
          "category": "Lifestyle",
          "amount": 146.42,
          "color": "#d5a338"
        },
        {
          "category": "Transportation",
          "amount": 81.86,
          "color": "#8d6da8"
        },
        {
          "category": "Utilities",
          "amount": 59.57,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2340.05,
      "categories": [
        {
          "category": "Salary",
          "amount": 2340.05,
          "color": "#008044"
        }
      ]
    }
  },
  "2025-07": {
    "spending": {
      "total": 2186.21,
      "categories": [
        {
          "category": "Travel",
          "amount": 676.93,
          "color": "#5c8db0"
        },
        {
          "category": "Housing",
          "amount": 504.42,
          "color": "#3b9b67"
        },
        {
          "category": "Entertainment",
          "amount": 456.99,
          "color": "#d17655"
        },
        {
          "category": "Invest Deposit",
          "amount": 257.12,
          "color": "#91a84c"
        },
        {
          "category": "Home & Tech",
          "amount": 167.62,
          "color": "#a1aaa7"
        },
        {
          "category": "Utilities",
          "amount": 123.13,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2669.96,
      "categories": [
        {
          "category": "Salary",
          "amount": 2669.96,
          "color": "#008044"
        }
      ]
    }
  },
  "2025-08": {
    "spending": {
      "total": 2028.69,
      "categories": [
        {
          "category": "Groceries",
          "amount": 494.36,
          "color": "#008044"
        },
        {
          "category": "Housing",
          "amount": 490.62,
          "color": "#3b9b67"
        },
        {
          "category": "Transportation",
          "amount": 253.0,
          "color": "#8d6da8"
        },
        {
          "category": "Invest Deposit",
          "amount": 238.36,
          "color": "#91a84c"
        },
        {
          "category": "Health",
          "amount": 220.35,
          "color": "#76b58e"
        },
        {
          "category": "Lifestyle",
          "amount": 169.7,
          "color": "#d5a338"
        },
        {
          "category": "Restaurants",
          "amount": 99.79,
          "color": "#6da8a4"
        },
        {
          "category": "Utilities",
          "amount": 62.51,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2475.17,
      "categories": [
        {
          "category": "Salary",
          "amount": 2475.17,
          "color": "#008044"
        }
      ]
    }
  },
  "2025-09": {
    "spending": {
      "total": 2004.87,
      "categories": [
        {
          "category": "Groceries",
          "amount": 609.06,
          "color": "#008044"
        },
        {
          "category": "Housing",
          "amount": 525.47,
          "color": "#3b9b67"
        },
        {
          "category": "Travel",
          "amount": 402.67,
          "color": "#5c8db0"
        },
        {
          "category": "Invest Deposit",
          "amount": 233.3,
          "color": "#91a84c"
        },
        {
          "category": "Utilities",
          "amount": 128.19,
          "color": "#b45d69"
        },
        {
          "category": "Restaurants",
          "amount": 106.18,
          "color": "#6da8a4"
        }
      ]
    },
    "income": {
      "total": 2422.61,
      "categories": [
        {
          "category": "Salary",
          "amount": 2422.61,
          "color": "#008044"
        }
      ]
    }
  },
  "2025-10": {
    "spending": {
      "total": 2328.47,
      "categories": [
        {
          "category": "Groceries",
          "amount": 701.49,
          "color": "#008044"
        },
        {
          "category": "Housing",
          "amount": 519.02,
          "color": "#3b9b67"
        },
        {
          "category": "Transportation",
          "amount": 268.63,
          "color": "#8d6da8"
        },
        {
          "category": "Invest Deposit",
          "amount": 225.85,
          "color": "#91a84c"
        },
        {
          "category": "Lifestyle",
          "amount": 179.41,
          "color": "#d5a338"
        },
        {
          "category": "Home & Tech",
          "amount": 158.96,
          "color": "#a1aaa7"
        },
        {
          "category": "Travel",
          "amount": 116.18,
          "color": "#5c8db0"
        },
        {
          "category": "Entertainment",
          "amount": 83.43,
          "color": "#d17655"
        },
        {
          "category": "Utilities",
          "amount": 75.5,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2345.29,
      "categories": [
        {
          "category": "Salary",
          "amount": 2345.29,
          "color": "#008044"
        }
      ]
    }
  },
  "2025-11": {
    "spending": {
      "total": 2169.78,
      "categories": [
        {
          "category": "Groceries",
          "amount": 754.73,
          "color": "#008044"
        },
        {
          "category": "Housing",
          "amount": 538.07,
          "color": "#3b9b67"
        },
        {
          "category": "Lifestyle",
          "amount": 252.89,
          "color": "#d5a338"
        },
        {
          "category": "Invest Deposit",
          "amount": 220.81,
          "color": "#91a84c"
        },
        {
          "category": "Health",
          "amount": 216.58,
          "color": "#76b58e"
        },
        {
          "category": "Transportation",
          "amount": 119.81,
          "color": "#8d6da8"
        },
        {
          "category": "Utilities",
          "amount": 66.89,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2292.98,
      "categories": [
        {
          "category": "Salary",
          "amount": 2292.98,
          "color": "#008044"
        }
      ]
    }
  },
  "2025-12": {
    "spending": {
      "total": 3014.4,
      "categories": [
        {
          "category": "Groceries",
          "amount": 951.42,
          "color": "#008044"
        },
        {
          "category": "Housing",
          "amount": 500.49,
          "color": "#3b9b67"
        },
        {
          "category": "Home & Tech",
          "amount": 482.88,
          "color": "#a1aaa7"
        },
        {
          "category": "Transportation",
          "amount": 402.09,
          "color": "#8d6da8"
        },
        {
          "category": "Invest Deposit",
          "amount": 275.66,
          "color": "#91a84c"
        },
        {
          "category": "Lifestyle",
          "amount": 226.94,
          "color": "#d5a338"
        },
        {
          "category": "Utilities",
          "amount": 174.92,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2862.48,
      "categories": [
        {
          "category": "Salary",
          "amount": 2862.48,
          "color": "#008044"
        }
      ]
    }
  },
  "2026-01": {
    "spending": {
      "total": 2512.42,
      "categories": [
        {
          "category": "Entertainment",
          "amount": 669.07,
          "color": "#d17655"
        },
        {
          "category": "Groceries",
          "amount": 557.62,
          "color": "#008044"
        },
        {
          "category": "Housing",
          "amount": 511.71,
          "color": "#3b9b67"
        },
        {
          "category": "Health",
          "amount": 400.5,
          "color": "#76b58e"
        },
        {
          "category": "Invest Deposit",
          "amount": 237.02,
          "color": "#91a84c"
        },
        {
          "category": "Utilities",
          "amount": 136.5,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2461.24,
      "categories": [
        {
          "category": "Salary",
          "amount": 2461.24,
          "color": "#008044"
        }
      ]
    }
  },
  "2026-02": {
    "spending": {
      "total": 2013.87,
      "categories": [
        {
          "category": "Health",
          "amount": 888.89,
          "color": "#76b58e"
        },
        {
          "category": "Housing",
          "amount": 525.93,
          "color": "#3b9b67"
        },
        {
          "category": "Invest Deposit",
          "amount": 223.87,
          "color": "#91a84c"
        },
        {
          "category": "Groceries",
          "amount": 161.5,
          "color": "#008044"
        },
        {
          "category": "Restaurants",
          "amount": 145.69,
          "color": "#6da8a4"
        },
        {
          "category": "Utilities",
          "amount": 67.99,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2324.74,
      "categories": [
        {
          "category": "Salary",
          "amount": 2324.74,
          "color": "#008044"
        }
      ]
    }
  },
  "2026-03": {
    "spending": {
      "total": 1802.03,
      "categories": [
        {
          "category": "Housing",
          "amount": 533.41,
          "color": "#3b9b67"
        },
        {
          "category": "Groceries",
          "amount": 421.73,
          "color": "#008044"
        },
        {
          "category": "Entertainment",
          "amount": 292.13,
          "color": "#d17655"
        },
        {
          "category": "Invest Deposit",
          "amount": 212.61,
          "color": "#91a84c"
        },
        {
          "category": "Health",
          "amount": 174.2,
          "color": "#76b58e"
        },
        {
          "category": "Utilities",
          "amount": 167.95,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2207.81,
      "categories": [
        {
          "category": "Salary",
          "amount": 2207.81,
          "color": "#008044"
        }
      ]
    }
  },
  "2026-04": {
    "spending": {
      "total": 2259.03,
      "categories": [
        {
          "category": "Housing",
          "amount": 519.52,
          "color": "#3b9b67"
        },
        {
          "category": "Groceries",
          "amount": 395.97,
          "color": "#008044"
        },
        {
          "category": "Health",
          "amount": 355.37,
          "color": "#76b58e"
        },
        {
          "category": "Entertainment",
          "amount": 291.04,
          "color": "#d17655"
        },
        {
          "category": "Invest Deposit",
          "amount": 223.56,
          "color": "#91a84c"
        },
        {
          "category": "Transportation",
          "amount": 174.02,
          "color": "#8d6da8"
        },
        {
          "category": "Utilities",
          "amount": 165.93,
          "color": "#b45d69"
        },
        {
          "category": "Lifestyle",
          "amount": 133.62,
          "color": "#d5a338"
        }
      ]
    },
    "income": {
      "total": 2321.45,
      "categories": [
        {
          "category": "Salary",
          "amount": 2321.45,
          "color": "#008044"
        }
      ]
    }
  },
  "2026-05": {
    "spending": {
      "total": 2386.63,
      "categories": [
        {
          "category": "Groceries",
          "amount": 610.2,
          "color": "#008044"
        },
        {
          "category": "Housing",
          "amount": 537.41,
          "color": "#3b9b67"
        },
        {
          "category": "Transportation",
          "amount": 527.7,
          "color": "#8d6da8"
        },
        {
          "category": "Travel",
          "amount": 344.9,
          "color": "#5c8db0"
        },
        {
          "category": "Invest Deposit",
          "amount": 261.48,
          "color": "#91a84c"
        },
        {
          "category": "Utilities",
          "amount": 104.94,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2715.23,
      "categories": [
        {
          "category": "Salary",
          "amount": 2715.23,
          "color": "#008044"
        }
      ]
    }
  },
  "2026-06": {
    "spending": {
      "total": 1803.3,
      "categories": [
        {
          "category": "Groceries",
          "amount": 516.61,
          "color": "#008044"
        },
        {
          "category": "Housing",
          "amount": 505.76,
          "color": "#3b9b67"
        },
        {
          "category": "Health",
          "amount": 329.91,
          "color": "#76b58e"
        },
        {
          "category": "Invest Deposit",
          "amount": 211.36,
          "color": "#91a84c"
        },
        {
          "category": "Utilities",
          "amount": 129.17,
          "color": "#b45d69"
        },
        {
          "category": "Lifestyle",
          "amount": 110.49,
          "color": "#d5a338"
        }
      ]
    },
    "income": {
      "total": 2194.84,
      "categories": [
        {
          "category": "Salary",
          "amount": 2194.84,
          "color": "#008044"
        }
      ]
    }
  },
  "2026-07": {
    "spending": {
      "total": 2570.42,
      "categories": [
        {
          "category": "Health",
          "amount": 867.23,
          "color": "#76b58e"
        },
        {
          "category": "Housing",
          "amount": 504.02,
          "color": "#3b9b67"
        },
        {
          "category": "Groceries",
          "amount": 499.71,
          "color": "#008044"
        },
        {
          "category": "Lifestyle",
          "amount": 354.21,
          "color": "#d5a338"
        },
        {
          "category": "Invest Deposit",
          "amount": 215.99,
          "color": "#91a84c"
        },
        {
          "category": "Utilities",
          "amount": 129.26,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2242.89,
      "categories": [
        {
          "category": "Salary",
          "amount": 2242.89,
          "color": "#008044"
        }
      ]
    }
  },
  "2026-08": {
    "spending": {
      "total": 2773.81,
      "categories": [
        {
          "category": "Health",
          "amount": 683.9,
          "color": "#76b58e"
        },
        {
          "category": "Housing",
          "amount": 537.24,
          "color": "#3b9b67"
        },
        {
          "category": "Groceries",
          "amount": 442.26,
          "color": "#008044"
        },
        {
          "category": "Entertainment",
          "amount": 274.95,
          "color": "#d17655"
        },
        {
          "category": "Invest Deposit",
          "amount": 231.92,
          "color": "#91a84c"
        },
        {
          "category": "Home & Tech",
          "amount": 218.58,
          "color": "#a1aaa7"
        },
        {
          "category": "Lifestyle",
          "amount": 163.56,
          "color": "#d5a338"
        },
        {
          "category": "Restaurants",
          "amount": 115.43,
          "color": "#6da8a4"
        },
        {
          "category": "Utilities",
          "amount": 105.97,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2408.31,
      "categories": [
        {
          "category": "Salary",
          "amount": 2408.31,
          "color": "#008044"
        }
      ]
    }
  },
  "2026-09": {
    "spending": {
      "total": 2114.38,
      "categories": [
        {
          "category": "Housing",
          "amount": 539.34,
          "color": "#3b9b67"
        },
        {
          "category": "Entertainment",
          "amount": 386.06,
          "color": "#d17655"
        },
        {
          "category": "Groceries",
          "amount": 379.79,
          "color": "#008044"
        },
        {
          "category": "Transportation",
          "amount": 266.8,
          "color": "#8d6da8"
        },
        {
          "category": "Invest Deposit",
          "amount": 235.72,
          "color": "#91a84c"
        },
        {
          "category": "Restaurants",
          "amount": 225.7,
          "color": "#6da8a4"
        },
        {
          "category": "Utilities",
          "amount": 80.97,
          "color": "#b45d69"
        }
      ]
    },
    "income": {
      "total": 2447.81,
      "categories": [
        {
          "category": "Salary",
          "amount": 2447.81,
          "color": "#008044"
        }
      ]
    }
  }
};
