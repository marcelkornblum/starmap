export const GREEK_BAYER_MAP: Record<string, string> = {
  alp: 'Alpha', bet: 'Beta', gam: 'Gamma', del: 'Delta', eps: 'Epsilon',
  zet: 'Zeta', eta: 'Eta', the: 'Theta', iot: 'Iota', kap: 'Kappa',
  lam: 'Lambda', mu: 'Mu', nu: 'Nu', xi: 'Xi', omi: 'Omicron',
  pi: 'Pi', rho: 'Rho', sig: 'Sigma', tau: 'Tau', ups: 'Upsilon',
  phi: 'Phi', chi: 'Chi', psi: 'Psi', ome: 'Omega',
};

export const UNICODE_GREEK_TO_LATIN_MAP: Record<string, string> = {
  α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', ε: 'epsilon',
  ζ: 'zeta', η: 'eta', θ: 'theta', ϑ: 'theta', ι: 'iota',
  κ: 'kappa', ϰ: 'kappa', λ: 'lambda', μ: 'mu', ν: 'nu',
  ξ: 'xi', ο: 'omicron', π: 'pi', ϖ: 'pi', ρ: 'rho',
  ϱ: 'rho', σ: 'sigma', ς: 'sigma', τ: 'tau', υ: 'upsilon',
  φ: 'phi', ϕ: 'phi', χ: 'chi', ψ: 'psi', ω: 'omega',
  Α: 'Alpha', Β: 'Beta', Γ: 'Gamma', Δ: 'Delta', Ε: 'Epsilon',
  Ζ: 'Zeta', Η: 'Eta', Θ: 'Theta', Ι: 'Iota', Κ: 'Kappa',
  Λ: 'Lambda', Μ: 'Mu', Ν: 'Nu', Ξ: 'Xi', Ο: 'Omicron',
  Π: 'Pi', Ρ: 'Rho', Σ: 'Sigma', Τ: 'Tau', Υ: 'Upsilon',
  Φ: 'Phi', Χ: 'Chi', Ψ: 'Psi', Ω: 'Omega',
};

export const SUPERSCRIPT_DIGIT_MAP: Record<string, string> = {
  '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5',
  '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁰': '0',
};

export const GREEK_CANONICAL_EXPANSION_MAP: Record<string, string> = {
  alp: 'Alpha', alpha: 'Alpha', bet: 'Beta', beta: 'Beta',
  gam: 'Gamma', gamma: 'Gamma', del: 'Delta', delta: 'Delta',
  eps: 'Epsilon', epsilon: 'Epsilon', zet: 'Zeta', zeta: 'Zeta',
  eta: 'Eta', the: 'Theta', theta: 'Theta', iot: 'Iota',
  iota: 'Iota', kap: 'Kappa', kappa: 'Kappa', lam: 'Lambda',
  lambda: 'Lambda', mu: 'Mu', nu: 'Nu', xi: 'Xi',
  omi: 'Omicron', omicron: 'Omicron', pi: 'Pi', rho: 'Rho',
  sig: 'Sigma', sigma: 'Sigma', tau: 'Tau', ups: 'Upsilon',
  upsilon: 'Upsilon', phi: 'Phi', chi: 'Chi', psi: 'Psi',
  ome: 'Omega', omega: 'Omega',
};

/**
 * Transliterates Unicode Greek characters and superscript digits to standard Latin and Arabic digits.
 */
export function transliterateGreekAndSuperscripts(raw: string): string {
  let result = '';
  for (const char of raw) {
    if (UNICODE_GREEK_TO_LATIN_MAP[char]) {
      result += UNICODE_GREEK_TO_LATIN_MAP[char];
    } else if (SUPERSCRIPT_DIGIT_MAP[char]) {
      result += SUPERSCRIPT_DIGIT_MAP[char];
    } else {
      result += char;
    }
  }
  return result;
}
