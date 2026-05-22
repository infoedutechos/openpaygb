// utils/calculations.ts

/**
 * This project was developed by Open Innovations Platforms and Technologies.
 *
 * Copyright (c) Open Innovations Platforms and Technologies. All rights reserved.
 * See utils/company-info.ts for official links and the license text returned by /api/license.
 */

export const calculateUpgradeCost = (levelIndex: number, basePrice: number, coefficient: number): number => {
    return Math.floor(basePrice * Math.pow(coefficient, levelIndex));
}

export const calculateUpgradeBenefit = (levelIndex: number, baseBenefit: number, coefficient: number): number => {
    let benefit = 0;
    for (let i = 0; i <= levelIndex; i++) {
        benefit += Math.floor(baseBenefit * Math.pow(coefficient, i));
    }
    return benefit;
}