package com.recycleconnect.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
@EnableAsync
public class TimeConfig {

    /** Replaced in tests to freeze time. */
    @Bean
    java.time.Clock systemClock() {
        return java.time.Clock.systemUTC();
    }
}
