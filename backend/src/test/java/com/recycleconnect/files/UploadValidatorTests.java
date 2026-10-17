package com.recycleconnect.files;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class UploadValidatorTests {

    @Test
    void recognisesRealFileTypesOnly() {
        assertThat(UploadValidator.sniff(new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0 })).isEqualTo(UploadValidator.Kind.JPEG);
        assertThat(UploadValidator.sniff(new byte[] { (byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10 })).isEqualTo(UploadValidator.Kind.PNG);
        assertThat(UploadValidator.sniff("RIFF0000WEBPVP8 ".getBytes())).isEqualTo(UploadValidator.Kind.WEBP);
        assertThat(UploadValidator.sniff("%PDF-1.7".getBytes())).isEqualTo(UploadValidator.Kind.PDF);
        assertThat(UploadValidator.sniff("<svg onload=alert(1)>".getBytes())).isNull();
        assertThat(UploadValidator.sniff("GIF89a".getBytes())).isNull();
        assertThat(UploadValidator.sniff(new byte[0])).isNull();
    }
}
