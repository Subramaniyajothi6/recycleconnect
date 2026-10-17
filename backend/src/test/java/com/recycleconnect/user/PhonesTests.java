package com.recycleconnect.user;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PhonesTests {

    @Test
    void acceptsCommonIndianFormats() {
        assertThat(Phones.normalize("+91 98400 12345")).isEqualTo("9840012345");
        assertThat(Phones.normalize("098400 12345")).isEqualTo("9840012345");
        assertThat(Phones.normalize("98400-12345")).isEqualTo("9840012345");
        assertThat(Phones.normalize("919840012345")).isEqualTo("9840012345");
    }

    @Test
    void rejectsInvalidNumbers() {
        assertThat(Phones.normalize(null)).isNull();
        assertThat(Phones.normalize("12345")).isNull();
        assertThat(Phones.normalize("5840012345")).isNull(); // Indian mobiles start with 6-9
        assertThat(Phones.normalize("98400123456")).isNull();
    }
}
