package com.recycleconnect.admin;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.recycleconnect.audit.AuditService;
import com.recycleconnect.common.ApiException;
import com.recycleconnect.common.BusinessClock;
import com.recycleconnect.user.User;

/** The seven reports in brief §24, as a preview table and a styled Excel file (CSV kept for API use; the UI offers Excel, D6). */
@Service
public class ReportService {

    public enum Type {
        COLLECTION_VOLUME("Collection volume"),
        WASTE_CATEGORIES("Waste categories"),
        CUSTOMER_ACTIVITY("Customer activity"),
        COLLECTOR_ACTIVITY("Collector activity"),
        PICKUP_COMPLETION("Pickup completion"),
        FAILED_PICKUPS("Failed pickups"),
        LOCATION_WISE("Location-wise collection");

        final String title;

        Type(String title) {
            this.title = title;
        }
    }

    public record Column(String key, String label, boolean number) {
    }

    public record Table(String type, String title, LocalDate from, LocalDate to, List<Column> columns,
            List<List<Object>> rows, List<Object> totals) {
    }

    public record Filters(LocalDate from, LocalDate to, Long zoneId, Long categoryId) {
    }

    private final NamedParameterJdbcTemplate jdbc;
    private final BusinessClock clock;
    private final AuditService audit;

    public ReportService(NamedParameterJdbcTemplate jdbc, BusinessClock clock, AuditService audit) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.audit = audit;
    }

    /** Padded with spaces: it is joined to text blocks, which drop trailing spaces. */
    private static final String KG = " (coalesce(i.actual_unit, i.unit) = 'KG') ";

    @Transactional(readOnly = true)
    public Table build(Type type, Filters in) {
        LocalDate to = in.to() != null ? in.to() : clock.today();
        LocalDate from = in.from() != null ? in.from() : to.withDayOfMonth(1);
        if (from.isAfter(to)) throw ApiException.field("from", "The start date must be before the end date.");
        if (from.plusYears(3).isBefore(to)) throw ApiException.field("from", "Pick a range of 3 years or less.");
        MapSqlParameterSource p = new MapSqlParameterSource("tz", clock.zone().getId()).addValue("from", from).addValue("to", to);
        String rf = "";
        if (in.zoneId() != null) {
            rf += " and r.zone_id = :zone";
            p.addValue("zone", in.zoneId());
        }
        if (in.categoryId() != null) {
            rf += " and exists (select 1 from request_items ci where ci.request_id = r.id and ci.category_id = :cat)";
            p.addValue("cat", in.categoryId());
        }
        String done = " r.status = 'COMPLETED' and (r.completed_at at time zone :tz)::date between :from and :to";
        return switch (type) {
            case COLLECTION_VOLUME -> table(type, from, to, List.of(col("month", "Month"), num("requests", "Completed requests"),
                    num("kg", "Kilograms"), num("pcs", "Pieces")), jdbc.query("""
                    select to_char((r.completed_at at time zone :tz), 'YYYY-MM'), count(distinct r.id),
                      coalesce(sum(i.actual_qty) filter (where """ + KG + "), 0), coalesce(sum(i.actual_qty) filter (where not " + KG + """
                    ), 0) from collection_requests r join request_items i on i.request_id = r.id
                    where""" + done + rf + " group by 1 order by 1", p, (rs, n) -> List.of(rs.getString(1), rs.getLong(2),
                    rs.getBigDecimal(3), rs.getBigDecimal(4))), 1);
            case WASTE_CATEGORIES -> table(type, from, to, List.of(col("category", "Material"), col("unit", "Unit"),
                    num("requests", "Requests"), num("estimated", "Estimated"), num("actual", "Collected"), num("share", "Share of kg (%)")),
                    jdbc.query("""
                    select c.name, coalesce(i.actual_unit, i.unit) u, count(distinct r.id), coalesce(sum(i.estimated_qty), 0),
                      coalesce(sum(i.actual_qty), 0),
                      case when coalesce(i.actual_unit, i.unit) = 'KG' then round(100 * coalesce(sum(i.actual_qty), 0) /
                        nullif(sum(sum(i.actual_qty)) filter (where coalesce(i.actual_unit, i.unit) = 'KG') over (), 0), 1) end
                    from collection_requests r join request_items i on i.request_id = r.id join waste_categories c on c.id = i.category_id
                    where""" + done + rf + " group by c.name, c.sort_order, u order by c.sort_order", p,
                    (rs, n) -> list(rs.getString(1), rs.getString(2), rs.getLong(3), rs.getBigDecimal(4), rs.getBigDecimal(5),
                            rs.getBigDecimal(6))), 2);
            case CUSTOMER_ACTIVITY -> table(type, from, to, List.of(col("customer", "Customer"), col("code", "ID"),
                    col("type", "Type"), col("area", "Area"), num("requests", "Requests"), num("completed", "Completed"),
                    num("cancelled", "Cancelled"), num("failed", "Failed"), num("kg", "Kilograms")), jdbc.query("""
                    select u.name, u.id, cp.customer_type, max(r.address_area), count(distinct r.id),
                      count(distinct r.id) filter (where r.status = 'COMPLETED'), count(distinct r.id) filter (where r.status = 'CANCELLED'),
                      count(distinct r.id) filter (where r.status = 'FAILED'),
                      coalesce(sum(i.actual_qty) filter (where r.status = 'COMPLETED' and """ + KG + """
                    ), 0) from collection_requests r join users u on u.id = r.customer_id
                    join customer_profiles cp on cp.user_id = u.id left join request_items i on i.request_id = r.id
                    where r.status <> 'DRAFT' and (r.created_at at time zone :tz)::date between :from and :to""" + rf
                    + " group by u.name, u.id, cp.customer_type order by 9 desc, 5 desc limit 5000", p,
                    (rs, n) -> list(rs.getString(1), AdminUserService.customerCode(rs.getLong(2)), rs.getString(3),
                            rs.getString(4), rs.getLong(5), rs.getLong(6), rs.getLong(7), rs.getLong(8), rs.getBigDecimal(9))), 4);
            case COLLECTOR_ACTIVITY -> table(type, from, to, List.of(col("collector", "Collector"), col("zones", "Areas"),
                    num("assigned", "Assigned"), num("completed", "Completed"), num("failed", "Failed"), num("kg", "Kilograms"),
                    num("ontime", "On time (%)")), jdbc.query("""
                    select u.name,
                      (select string_agg(z.name, ', ' order by z.name) from collector_zones cz join zones z on z.id = cz.zone_id where cz.collector_id = u.id),
                      count(p.id), count(p.id) filter (where p.pickup_status in ('COLLECTED', 'COMPLETED')),
                      count(p.id) filter (where p.pickup_status = 'FAILED'),
                      coalesce((select sum(i.actual_qty) from request_items i join pickups pp on pp.request_id = i.request_id
                        where pp.collector_id = u.id and pp.pickup_status in ('COLLECTED', 'COMPLETED') and """ + KG + """
                        and pp.scheduled_date between :from and :to), 0),
                      round(100.0 * count(p.id) filter (where p.pickup_status in ('COLLECTED', 'COMPLETED')
                        and (p.collected_at at time zone :tz) <= p.scheduled_date + substring(p.slot from 7 for 5)::time)
                        / nullif(count(p.id) filter (where p.pickup_status in ('COLLECTED', 'COMPLETED')), 0))
                    from users u join pickups p on p.collector_id = u.id join collection_requests r on r.id = p.request_id
                    where u.role = 'COLLECTOR' and p.scheduled_date between :from and :to""" + rf
                    + " group by u.id, u.name order by 4 desc", p,
                    (rs, n) -> list(rs.getString(1), rs.getString(2), rs.getLong(3), rs.getLong(4), rs.getLong(5),
                            rs.getBigDecimal(6), rs.getBigDecimal(7))), 2);
            case PICKUP_COMPLETION -> table(type, from, to, List.of(col("month", "Month"), num("completed", "Completed"),
                    num("failed", "Failed"), num("cancelled", "Cancelled"), num("rate", "Completion rate (%)")), jdbc.query("""
                    select to_char(coalesce(r.scheduled_date, r.preferred_date), 'YYYY-MM') m,
                      count(*) filter (where r.status in ('COLLECTED', 'COMPLETED')), count(*) filter (where r.status = 'FAILED'),
                      count(*) filter (where r.status = 'CANCELLED'),
                      round(100.0 * count(*) filter (where r.status in ('COLLECTED', 'COMPLETED'))
                        / nullif(count(*) filter (where r.status in ('COLLECTED', 'COMPLETED', 'FAILED', 'CANCELLED')), 0), 1)
                    from collection_requests r where r.status <> 'DRAFT'
                      and coalesce(r.scheduled_date, r.preferred_date) between :from and :to""" + rf + " group by 1 order by 1", p,
                    (rs, n) -> list(rs.getString(1), rs.getLong(2), rs.getLong(3), rs.getLong(4), rs.getBigDecimal(5))), 1);
            case FAILED_PICKUPS -> table(type, from, to, List.of(col("date", "Date"), col("slot", "Slot"),
                    col("request", "Request"), col("customer", "Customer"), col("area", "Area"), col("collector", "Collector"),
                    col("reason", "Reason"), col("note", "Note")), jdbc.query("""
                    select p.scheduled_date, p.slot, r.code, cu.name, r.address_area, co.name, p.fail_reason, p.fail_note
                    from pickups p join collection_requests r on r.id = p.request_id join users cu on cu.id = r.customer_id
                    join users co on co.id = p.collector_id
                    where p.pickup_status = 'FAILED' and p.scheduled_date between :from and :to""" + rf
                    + " order by p.scheduled_date desc, p.slot limit 5000", p,
                    (rs, n) -> list(rs.getDate(1).toLocalDate().toString(), rs.getString(2), rs.getString(3), rs.getString(4),
                            rs.getString(5), rs.getString(6), rs.getString(7) == null ? null
                                    : com.recycleconnect.request.FailReason.valueOf(rs.getString(7)).label(), rs.getString(8))), -1);
            case LOCATION_WISE -> locationWise(from, to, p, rf);
        };
    }

    /** Areas down, the four biggest materials across, then "Other" and the total. */
    private Table locationWise(LocalDate from, LocalDate to, MapSqlParameterSource p, String rf) {
        String done = " r.status = 'COMPLETED' and (r.completed_at at time zone :tz)::date between :from and :to and " + KG;
        List<String[]> top = jdbc.query("""
                select c.code, c.name from collection_requests r join request_items i on i.request_id = r.id
                join waste_categories c on c.id = i.category_id where""" + done + rf
                + " group by c.code, c.name order by sum(i.actual_qty) desc limit 4", p,
                (rs, n) -> new String[] { rs.getString(1), rs.getString(2) });
        List<Column> cols = new ArrayList<>();
        cols.add(col("area", "Area"));
        cols.add(num("requests", "Requests"));
        top.forEach(t -> cols.add(num(t[0], t[1] + " (kg)")));
        cols.add(num("other", "Other (kg)"));
        cols.add(num("total", "Total (kg)"));
        StringBuilder sql = new StringBuilder("select coalesce(z.name, r.address_area, 'Other'), count(distinct r.id)");
        for (int k = 0; k < top.size(); k++) {
            sql.append(", coalesce(sum(i.actual_qty) filter (where c.code = :c").append(k).append("), 0)");
            p.addValue("c" + k, top.get(k)[0]);
        }
        p.addValue("tops", top.isEmpty() ? List.of("-") : top.stream().map(t -> t[0]).toList());
        sql.append(", coalesce(sum(i.actual_qty) filter (where c.code not in (:tops)), 0), coalesce(sum(i.actual_qty), 0)")
                .append(" from collection_requests r join request_items i on i.request_id = r.id")
                .append(" join waste_categories c on c.id = i.category_id left join zones z on z.id = r.zone_id where")
                .append(done).append(rf).append(" group by 1 order by ").append(top.size() + 4).append(" desc");
        int n = top.size();
        List<List<Object>> rows = jdbc.query(sql.toString(), p, (rs, i) -> {
            List<Object> row = new ArrayList<>();
            row.add(rs.getString(1));
            row.add(rs.getLong(2));
            for (int k = 0; k < n + 2; k++) row.add(rs.getBigDecimal(3 + k));
            return row;
        });
        return table(Type.LOCATION_WISE, from, to, cols, rows, 1);
    }

    private static Column col(String key, String label) {
        return new Column(key, label, false);
    }

    private static Column num(String key, String label) {
        return new Column(key, label, true);
    }

    private static List<Object> list(Object... values) {
        List<Object> out = new ArrayList<>();
        for (Object v : values) out.add(v);
        return out;
    }

    /** Totals for every numeric column from {@code firstSummed} on (percentages are left blank). */
    private static Table table(Type type, LocalDate from, LocalDate to, List<Column> cols, List<List<Object>> rows, int firstSummed) {
        List<Object> totals = null;
        if (firstSummed >= 0) {
            totals = new ArrayList<>();
            for (int c = 0; c < cols.size(); c++) {
                if (c == 0) totals.add("Total");
                else if (c < firstSummed || !cols.get(c).number() || cols.get(c).label().contains("%")) totals.add(null);
                else {
                    BigDecimal sum = BigDecimal.ZERO;
                    for (List<Object> r : rows) {
                        Object v = r.get(c);
                        if (v instanceof BigDecimal b) sum = sum.add(b);
                        else if (v instanceof Number num) sum = sum.add(BigDecimal.valueOf(num.longValue()));
                    }
                    totals.add(sum);
                }
            }
        }
        return new Table(type.name(), type.title, from, to, cols, rows, totals);
    }

    // ---------- export ----------

    public record File(String name, String contentType, byte[] bytes) {
    }

    public File export(User admin, Type type, Filters f, String format) {
        Table t = build(type, f);
        String base = t.title().toLowerCase().replace(' ', '-').replace("-wise", "") + "_" + t.from() + "_" + t.to();
        audit.recordStandalone(admin, "EXPORT_REPORT", "report", type.name(),
                Map.of("format", format, "from", t.from().toString(), "to", t.to().toString(), "rows", t.rows().size()));
        return switch (format) {
            case "xlsx" -> new File(base + ".xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", xlsx(t));
            case "csv" -> new File(base + ".csv", "text/csv; charset=utf-8", csv(t.columns().stream().map(Column::label).toList(),
                    t.rows(), t.totals()));
            default -> throw ApiException.badRequest("Pick CSV or Excel.");
        };
    }

    /** CSV with a BOM so Excel reads UTF-8. Cells that look like formulas are prefixed so they stay text. */
    public static byte[] csv(List<String> header, List<List<Object>> rows, List<Object> totals) {
        StringBuilder sb = new StringBuilder("﻿");
        sb.append(String.join(",", header.stream().map(ReportService::cell).toList())).append("\r\n");
        for (List<Object> r : rows) sb.append(String.join(",", r.stream().map(ReportService::cell).toList())).append("\r\n");
        if (totals != null) sb.append(String.join(",", totals.stream().map(ReportService::cell).toList())).append("\r\n");
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    static String cell(Object v) {
        if (v == null) return "";
        String s = v instanceof BigDecimal b ? b.stripTrailingZeros().toPlainString() : v.toString();
        if (!(v instanceof Number) && !s.isEmpty() && "=+-@\t\r".indexOf(s.charAt(0)) >= 0) s = "'" + s;
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            s = "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }

    // Colours from the approved design (design/shared/sorted.css).
    private static final byte[] LEAF = rgb(0x1E7A55), LEAF_INK = rgb(0x0F4D35), LEAF_SOFT = rgb(0xE3F1EA),
            STRIPE = rgb(0xF5F8F6), LINE = rgb(0xD5DFD9), MUTED = rgb(0x5E6B64), WHITE = rgb(0xFFFFFF);
    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm", Locale.ENGLISH);

    private static byte[] rgb(int hex) {
        return new byte[] { (byte) (hex >> 16), (byte) (hex >> 8), (byte) hex };
    }

    private byte[] xlsx(Table t) {
        return styledXlsx(t, t.from().format(DAY) + " to " + t.to().format(DAY));
    }

    /**
     * One sheet styled like the app: title, a "RecycleConnect · {about} · Generated …" line, green header, striped
     * rows, bold total, frozen header. Used by the reports and the audit log download.
     */
    public byte[] styledXlsx(Table t, String about) {
        int cols = t.columns().size();
        try (SXSSFWorkbook wb = new SXSSFWorkbook(200); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet(t.title());
            Styles st = new Styles(wb);

            Row title = sheet.createRow(0);
            title.setHeightInPoints(26);
            cell(title, 0, t.title(), st.title);
            Row sub = sheet.createRow(1);
            cell(sub, 0, "RecycleConnect · " + about + " · Generated " + clock.localNow().format(STAMP), st.sub);
            if (cols > 1) {
                sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, cols - 1));
                sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, cols - 1));
            }

            int headRow = 3;
            Row head = sheet.createRow(headRow);
            head.setHeightInPoints(22);
            for (int c = 0; c < cols; c++) {
                Column col = t.columns().get(c);
                cell(head, c, col.label(), col.number() ? st.headNum : st.head);
            }

            // Per column: whole numbers, one decimal, or a percentage.
            CellStyle[][] body = new CellStyle[cols][];
            for (int c = 0; c < cols; c++) body[c] = st.forColumn(t.columns().get(c), wholeNumbers(t, c));

            int r = headRow + 1;
            for (List<Object> row : t.rows()) {
                Row x = sheet.createRow(r);
                int band = (r - headRow - 1) % 2;
                for (int c = 0; c < cols; c++) value(x, c, c < row.size() ? row.get(c) : null, body[c][band]);
                r++;
            }
            if (t.rows().isEmpty()) {
                cell(sheet.createRow(r++), 0, "No data for this period.", st.sub);
            } else if (t.totals() != null) {
                Row x = sheet.createRow(r);
                for (int c = 0; c < cols; c++) value(x, c, c < t.totals().size() ? t.totals().get(c) : null, body[c][2]);
            }

            for (int c = 0; c < cols; c++) sheet.setColumnWidth(c, Math.min(60, Math.max(12, widest(t, c) + 4)) * 256);
            sheet.createFreezePane(0, headRow + 1);
            sheet.getPrintSetup().setLandscape(true);
            sheet.getPrintSetup().setFitWidth((short) 1);
            sheet.getPrintSetup().setFitHeight((short) 0);
            sheet.setFitToPage(true);
            sheet.setRepeatingRows(new CellRangeAddress(headRow, headRow, 0, Math.max(cols - 1, 0)));
            wb.write(out);
            wb.dispose();
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Could not build the Excel file", e);
        }
    }

    private static boolean wholeNumbers(Table t, int c) {
        List<List<Object>> all = new ArrayList<>(t.rows());
        if (t.totals() != null) all.add(t.totals());
        for (List<Object> row : all) {
            Object v = c < row.size() ? row.get(c) : null;
            if (v instanceof BigDecimal b && b.stripTrailingZeros().scale() > 0) return false;
            if (v instanceof Double d && d % 1 != 0) return false;
        }
        return true;
    }

    private static int widest(Table t, int c) {
        int w = t.columns().get(c).label().length();
        for (List<Object> row : t.rows()) {
            Object v = c < row.size() ? row.get(c) : null;
            if (v != null) w = Math.max(w, cell(v).length());
        }
        return w;
    }

    private static void cell(Row row, int c, String text, CellStyle style) {
        Cell x = row.createCell(c);
        x.setCellValue(text);
        x.setCellStyle(style);
    }

    private static void value(Row row, int c, Object v, CellStyle style) {
        Cell x = row.createCell(c);
        if (v instanceof BigDecimal b) x.setCellValue(b.doubleValue());
        else if (v instanceof Number n) x.setCellValue(n.doubleValue());
        else if (v != null) x.setCellValue(v.toString());
        x.setCellStyle(style);
    }

    /** Cell styles for one workbook (Excel limits how many a file may hold, so they are made once). */
    private static final class Styles {
        final SXSSFWorkbook wb;
        final CellStyle title, sub, head, headNum;
        private final Map<String, CellStyle[]> byFormat = new java.util.HashMap<>();

        Styles(SXSSFWorkbook wb) {
            this.wb = wb;
            title = style(font(16, true, LEAF_INK, false), null, false, false);
            sub = style(font(10, false, MUTED, true), null, false, false);
            head = style(font(11, true, WHITE, false), LEAF, true, false);
            headNum = style(font(11, true, WHITE, false), LEAF, true, true);
            head.setVerticalAlignment(VerticalAlignment.CENTER);
            headNum.setVerticalAlignment(VerticalAlignment.CENTER);
        }

        /** [plain row, striped row, total row] for a column. */
        CellStyle[] forColumn(Column col, boolean whole) {
            String fmt = !col.number() ? null : col.label().contains("(%)") ? "0.0\"%\"" : whole ? "#,##0" : "#,##0.0#";
            return byFormat.computeIfAbsent(String.valueOf(fmt), k -> {
                XSSFFont normal = font(11, false, null, false), bold = font(11, true, LEAF_INK, false);
                CellStyle[] s = { style(normal, null, true, col.number()), style(normal, STRIPE, true, col.number()),
                        style(bold, LEAF_SOFT, true, col.number()) };
                s[2].setBorderTop(BorderStyle.MEDIUM);
                ((XSSFCellStyle) s[2]).setTopBorderColor(new XSSFColor(LEAF, null));
                if (fmt != null) for (CellStyle x : s) x.setDataFormat(wb.createDataFormat().getFormat(fmt));
                for (CellStyle x : s) {
                    x.setVerticalAlignment(VerticalAlignment.TOP);
                    if (fmt == null) x.setWrapText(true); // long text (audit details) wraps inside its column
                }
                return s;
            });
        }

        private XSSFFont font(int size, boolean bold, byte[] color, boolean italic) {
            XSSFFont f = (XSSFFont) wb.createFont();
            f.setFontName("Calibri");
            f.setFontHeightInPoints((short) size);
            f.setBold(bold);
            f.setItalic(italic);
            if (color != null) f.setColor(new XSSFColor(color, null));
            return f;
        }

        private CellStyle style(XSSFFont font, byte[] fill, boolean borders, boolean right) {
            XSSFCellStyle s = (XSSFCellStyle) wb.createCellStyle();
            s.setFont(font);
            if (fill != null) {
                s.setFillForegroundColor(new XSSFColor(fill, null));
                s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            }
            if (borders) {
                s.setBorderBottom(BorderStyle.THIN);
                s.setBottomBorderColor(new XSSFColor(LINE, null));
            }
            if (right) s.setAlignment(HorizontalAlignment.RIGHT);
            return s;
        }
    }
}
