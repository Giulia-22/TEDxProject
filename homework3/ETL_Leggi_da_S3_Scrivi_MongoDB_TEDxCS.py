###### TEDx-Load-Aggregate-Model
######

import sys
import json
import pyspark
from pyspark.sql.functions import col, collect_list, array_join, collect_set, struct

from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job




##### FROM FILES
tedx_dataset_path = "s3://mf-dati/tedx_dataset.csv"

###### READ PARAMETERS
args = getResolvedOptions(sys.argv, ['JOB_NAME'])

##### START JOB CONTEXT AND JOB
sc = SparkContext()


glueContext = GlueContext(sc)
spark = glueContext.spark_session


    
job = Job(glueContext)
job.init(args['JOB_NAME'], args)


#### READ INPUT FILES TO CREATE AN INPUT DATASET
tedx_dataset = spark.read \
    .option("header","true") \
    .option("quote", "\"") \
    .option("escape", "\"") \
    .option("multiline", "true") \
    .csv(tedx_dataset_path)
    
tedx_dataset.printSchema()


#### FILTER ITEMS WITH NULL POSTING KEY
count_items = tedx_dataset.count()
count_items_null = tedx_dataset.filter("idx is not null").count()

print(f"Number of items from RAW DATA {count_items}")
print(f"Number of items from RAW DATA with NOT NULL KEY {count_items_null}")



## READ TAGS DATASET
tags_dataset_path = "s3://mf-dati/tags_dataset.csv"
tags_dataset = spark.read.option("header","true").csv(tags_dataset_path)



# CREATE THE AGGREGATE MODEL, ADD TAGS TO TEDX_DATASET
tags_dataset_agg = tags_dataset.groupBy(col("idx").alias("idx_ref")).agg(collect_list("tag").alias("tags"))
tags_dataset_agg.printSchema()
tedx_dataset_agg = tedx_dataset.join(tags_dataset_agg, tedx_dataset.idx == tags_dataset_agg.idx_ref, "left") \
    .drop("idx_ref") \
    .select(col("idx").alias("_id"), col("*")) \
    .drop("idx") \

tedx_dataset_agg.printSchema()

## READ WATCHNEXT DATASET
watchnext_dataset_path = "s3://mf-dati/watch_next_dataset.csv"
watchnext_dataset = spark.read.option("header","true").csv(watchnext_dataset_path)

## FILTER WATCHNEXT DATASET
watchnext_dataset = watchnext_dataset.dropDuplicates()
watchnext_dataset = watchnext_dataset.filter('url LIKE "https://www.ted.com/talks/%"')

## READ CS DATASET
cs_dataset_path = "s3://mf-dati/tedx_cs_dataset_valori.csv"
cs_dataset = spark.read.option("header","true").csv(cs_dataset_path)

## ADD PERCENTAGE TO WATCHNEXT
watchnext_dataset = watchnext_dataset.select(col("idx").alias("idx_ref_watchnext"), col("url").alias("url_watchnext"), col("watch_next_idx") \
    .alias("watch_next_idx_watchnext"))
watchnext_dataset = watchnext_dataset.join(cs_dataset, watchnext_dataset.watch_next_idx_watchnext == cs_dataset.idx, "left").drop("idx")

## CREATE THE AGGREGATE MODEL, ADD WATCHNEXT DATASET
watchnext_dataset_agg = watchnext_dataset.groupBy(col("idx_ref_watchnext")).agg(collect_list(struct("url_watchnext", "watch_next_idx_watchnext" \
    , "gradimento")).alias("watchnext_struct"))
watchnext_dataset_agg.printSchema()
tedx_dataset_agg = tedx_dataset_agg.join(watchnext_dataset_agg, tedx_dataset_agg._id == watchnext_dataset_agg.idx_ref_watchnext, "left") \
    .drop("idx_ref_watchnext")

tedx_dataset_agg.printSchema()



## ADD PERCENTAGE

## CREATE THE AGGREGATE MODEL, ADD CS DATASET
tedx_dataset_agg = tedx_dataset_agg.join(cs_dataset, tedx_dataset_agg._id == cs_dataset.idx, \
    "left") \
    .drop("idx")

tedx_dataset_agg.printSchema()



mongo_uri = "mongodb+srv://mfanton1:mfanton1@mycluster.jm49ir6.mongodb.net"
print(mongo_uri)

write_mongo_options = {
    "uri": mongo_uri,
    "database": "unibg_tedx_2023",
    "collection": "tedx_data",
    "ssl": "true",
    "ssl.domain_match": "false"}
from awsglue.dynamicframe import DynamicFrame
tedx_dataset_dynamic_frame = DynamicFrame.fromDF(tedx_dataset_agg, glueContext, "nested")

glueContext.write_dynamic_frame.from_options(tedx_dataset_dynamic_frame, connection_type="mongodb", connection_options=write_mongo_options)