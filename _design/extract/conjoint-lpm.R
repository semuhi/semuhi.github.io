# Conjoint LPM extraction for the website playable finding (business portfolio).
# Source data: publication-epsr replication (data/full.RData, 3,258 profile ratings,
# 1,629 raters within 1,732 survey respondents).
#
# Fits an additive linear probability model per outcome (the same no-interactions
# assumption behind the published AMCEs/marginal means), clustered by respondent,
# and writes conjoint-lpm.json with:
#   pred: predicted outcome + 95% CI for all 128 attribute combinations
#   coef: per-level contributions vs the reference profile + 95% CI
#   base: the reference profile and its prediction
# Reference profile = Private / Middle / Critical / Automobile / TUSIAD, so
# contributions read as each pick's push relative to the anti-crony archetype.
# Outcomes: forced = p_selected (chosen as audit target, 0/1);
#           scale = p_treat2 (endorsed extra fine, rescaled 0-1, displayed x6).
# Run from publication-epsr:  Rscript <this file>

pacman::p_load(sandwich, jsonlite)
set.seed(1907)
options(scipen = 999)

load("data/full.RData")

full$p_sec   <- relevel(full$p_sec, ref = "Automobile")
full$p_assoc <- relevel(full$p_assoc, ref = "TUSIAD")

ATTRS <- list(p_contract = "Contract", p_size = "Firm Size", p_support = "Policies",
              p_sec = "Sector", p_assoc = "Association")

grid <- expand.grid(lapply(full[names(ATTRS)], levels), stringsAsFactors = FALSE)
names(grid) <- names(ATTRS)
for (v in names(ATTRS)) grid[[v]] <- factor(grid[[v]], levels = levels(full[[v]]))
stopifnot(nrow(grid) == 128)
key <- apply(grid, 1, paste, collapse = "|")

extract <- function(dv) {
  f <- reformulate(names(ATTRS), response = dv)
  m <- lm(f, data = full)
  V <- sandwich::vcovCL(m, cluster = full$response_id)
  b <- coef(m)

  # predictions with cluster-robust 95% CI for every profile
  X <- model.matrix(delete.response(terms(m)), grid)
  est <- as.vector(X %*% b)
  se  <- sqrt(rowSums((X %*% V) * X))
  pred <- setNames(lapply(seq_along(est), function(i)
    round(c(est[i], est[i] - 1.96 * se[i], est[i] + 1.96 * se[i]), 4)), key)

  # per-level contributions (reference levels are an exact 0)
  ci <- b + outer(sqrt(diag(V)), c(0, -1.96, 1.96))
  co <- list()
  for (v in names(ATTRS)) for (l in levels(full[[v]])) {
    cn <- paste0(v, l)
    co[[paste0(ATTRS[[v]], "|", l)]] <-
      if (cn %in% names(b)) round(unname(ci[cn, ]), 4) else c(0, 0, 0)
  }

  ref <- paste(sapply(full[names(ATTRS)], function(x) levels(x)[1]), collapse = "|")
  stopifnot(abs(pred[[ref]][1] - round(unname(b["(Intercept)"]), 4)) < 2e-4)
  # additivity check: prediction == intercept + sum of selected contributions
  chk <- sample(seq_len(nrow(grid)), 20)
  for (i in chk) {
    parts <- mapply(function(v, l) co[[paste0(ATTRS[[v]], "|", l)]][1],
                    names(ATTRS), as.character(unlist(grid[i, ])))
    stopifnot(abs((b["(Intercept)"] + sum(parts)) - est[i]) < 2e-3)
  }
  list(n = nobs(m), base_key = ref, base = pred[[ref]], pred = pred, coef = co)
}

out <- list(forced = extract("p_selected"), scale = extract("p_treat2"))
cat("forced n =", out$forced$n, "| scale n =", out$scale$n, "\n")
cat("baseline (", out$forced$base_key, ") forced:", out$forced$base, "\n")
crony <- "Public|Large|Supportive|Construction|MUSIAD"
cat("crony default forced:", out$forced$pred[[crony]], "\n")
cat("crony default scale :", out$scale$pred[[crony]], "\n")

writeLines(jsonlite::toJSON(out, auto_unbox = TRUE, digits = 4),
           file.path(dirname(sub("--file=", "", grep("--file=", commandArgs(), value = TRUE))),
                     "conjoint-lpm.json"))
cat("wrote conjoint-lpm.json\n")
