/**
 * Read a chain's company from the tester's eSim setup sheet, so the tester
 * never edits code: 02-plan/EAINT-12341_eSim_Setup.xlsx, tab "1 Companies",
 * the row whose "Robot run" is CH1 / CH2 / … (yellow cells F–I).
 *
 * A company set in chain-scenarios.ts wins over the sheet. Lives under
 * automation/ so `exceljs` resolves from automation/node_modules.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import ExcelJS from "exceljs";

/** Same shape as `Company` in cr/EAINT-12341/03-spec/chain-scenarios.ts. */
export interface SheetCompany {
  roc: string;
  newRoc: string;
  tin: string;
  sheetRow: number;
}

function text(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "result" in v) return String((v as { result?: unknown }).result ?? "").trim();
  if (typeof v === "object" && "richText" in v) return (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join("").trim();
  if (typeof v === "object" && "text" in v) return String((v as { text: unknown }).text).trim();
  return String(v).trim();
}

/** The company for e.g. "12341_CH1", or undefined when its row is empty. */
export async function companyFromSheet(
  chainId: string,
  file: string,
  opts: { tinOnly?: boolean } = {},
): Promise<SheetCompany | undefined> {
  if (!fs.existsSync(file)) return undefined;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet("1 Companies");
  if (!ws) throw new Error(`${path.basename(file)} has no tab "1 Companies".`);
  const run = chainId.replace(/^12341_/, "").toUpperCase();
  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (text(row.getCell(2).value).toUpperCase() !== run) continue;
    const roc = text(row.getCell(6).value).toUpperCase();
    const newRoc = text(row.getCell(7).value).replace(/\D/g, "");
    const tin = text(row.getCell(8).value).toUpperCase();
    const sheetRow = Number(text(row.getCell(9).value)) || 0;
    if (!roc && !newRoc && !tin) return undefined;
    // Business Trading: no SSM numbers, only the TIN is needed.
    if (opts.tinOnly) return tin ? { roc: "", newRoc: "", tin, sheetRow } : undefined;
    if (!roc || newRoc.length !== 12 || !tin) {
      throw new Error(
        `${path.basename(file)} row ${r} (${run}) is incomplete: need ROC/ROB with letter, a 12-digit new number ` +
          `and a TIN — got "${roc}", "${newRoc}", "${tin}".`,
      );
    }
    return { roc, newRoc, tin, sheetRow };
  }
  return undefined;
}
