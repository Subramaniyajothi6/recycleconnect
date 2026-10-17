package com.recycleconnect.user;

/** Indian mobile numbers, stored as 10 digits without the country code. */
public final class Phones {

    private Phones() {
    }

    /**
     * Accepts "+91 98400 12345", "098400 12345", "9840012345" and similar.
     *
     * @return the 10-digit number, or {@code null} if it isn't a valid Indian mobile number
     */
    public static String normalize(String input) {
        if (input == null) {
            return null;
        }
        String digits = input.replaceAll("\\D", "");
        if (digits.length() == 12 && digits.startsWith("91")) {
            digits = digits.substring(2);
        } else if (digits.length() == 11 && digits.startsWith("0")) {
            digits = digits.substring(1);
        }
        return digits.matches("[6-9]\\d{9}") ? digits : null;
    }
}
