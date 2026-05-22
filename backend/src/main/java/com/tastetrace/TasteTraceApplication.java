package com.tastetrace;

import com.tastetrace.config.AppProperties;
import com.tastetrace.config.MinioProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({AppProperties.class, MinioProperties.class})
public class TasteTraceApplication {

    public static void main(String[] args) {
        SpringApplication.run(TasteTraceApplication.class, args);
    }
}
