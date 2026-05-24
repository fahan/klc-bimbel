import { ImportStudentRow } from '../dto/import-students.dto'

export class CsvParser {
  /**
   * Parse CSV file buffer to array of objects
   */
  static parseCSV(buffer: Buffer): {
    rows: ImportStudentRow[]
    errors: Array<{ row: number; error: string }>
  } {
    const content = buffer.toString('utf-8')
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)

    console.log(`[CSV Parser] Total lines: ${lines.length}`)
    console.log(`[CSV Parser] First line (header): ${lines[0]}`)

    if (lines.length < 2) {
      return {
        rows: [],
        errors: [{ row: 0, error: 'File CSV kosong atau hanya berisi header. Minimal harus ada 1 baris data ditambah header.' }],
      }
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    console.log(`[CSV Parser] Headers: ${JSON.stringify(headers)}`)

    const requiredHeaders = ['name', 'branchid']
    const optionalHeaders = ['classlevel', 'parentname', 'parentphone']

    // Validate headers
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    if (missingHeaders.length > 0) {
      console.log(`[CSV Parser] Missing headers: ${JSON.stringify(missingHeaders)}`)
      return {
        rows: [],
        errors: [
          {
            row: 1,
            error: `Header CSV tidak valid. Field yang diperlukan: ${requiredHeaders.join(', ')}. Header yang ditemukan: ${headers.join(', ')}`,
          },
        ],
      }
    }

    // Get column indices
    const nameIndex = headers.indexOf('name')
    const branchIdIndex = headers.indexOf('branchid')
    const classLevelIndex = headers.indexOf('classlevel')
    const parentNameIndex = headers.indexOf('parentname')
    const parentPhoneIndex = headers.indexOf('parentphone')

    // Parse data rows
    const rows: ImportStudentRow[] = []
    const errors: Array<{ row: number; error: string }> = []

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim())
        console.log(`[CSV Parser] Row ${i + 1}: ${JSON.stringify(values)}`)

        // Validate required fields
        const name = values[nameIndex]?.trim()
        const branchId = values[branchIdIndex]?.trim()

        console.log(`[CSV Parser] Row ${i + 1} - name: "${name}", branchId: "${branchId}"`)

        if (!name || !branchId) {
          const errorMsg = `Field name${!name ? ' (kosong)' : ''} dan branchId${!branchId ? ' (kosong)' : ''} tidak boleh kosong`
          console.log(`[CSV Parser] Row ${i + 1} error: ${errorMsg}`)
          errors.push({
            row: i + 1,
            error: errorMsg,
          })
          continue
        }

        if (name.length < 3) {
          console.log(`[CSV Parser] Row ${i + 1} error: Nama terlalu pendek (${name.length} karakter)`)
          errors.push({
            row: i + 1,
            error: `Nama siswa minimal 3 karakter (saat ini: ${name.length} karakter)`,
          })
          continue
        }

        const newRow: ImportStudentRow = {
          name,
          branchId,
          classLevel: values[classLevelIndex] || undefined,
          parentName: values[parentNameIndex] || undefined,
          parentPhone: values[parentPhoneIndex] || undefined,
        }
        console.log(`[CSV Parser] Row ${i + 1} valid, adding to rows`)
        rows.push(newRow)
      } catch (error) {
        const errorMsg = `Error parsing row: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.log(`[CSV Parser] Row ${i + 1} exception: ${errorMsg}`)
        errors.push({
          row: i + 1,
          error: errorMsg,
        })
      }
    }

    console.log(`[CSV Parser] Summary - Total rows: ${rows.length}, Errors: ${errors.length}`)
    return { rows, errors }
  }
}
