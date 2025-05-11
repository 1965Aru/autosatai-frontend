// app/natural-resources-results/page.jsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Container,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  AppBar,
  Toolbar,
  Button,
  Divider,
  useTheme,
  ThemeProvider,
  createTheme,
  alpha,
  Avatar,
  Paper,
} from "@mui/material";
import {
  ArrowBack,
  Download,
  ForestOutlined,
  WaterDrop,
  ApartmentOutlined,
  LandscapeOutlined,
  InfoOutlined,
  Schedule,
} from "@mui/icons-material";
import { motion } from "framer-motion";
import {
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarAngleAxis,
  PolarGrid,
  AreaChart,
  Area,
  ResponsiveContainer,
  Cell,
  Tooltip as ReTooltip,
  Legend,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { z } from "zod";

// client‐only map component (Leaflet, window etc.)
const InteractiveMap = dynamic(() => import("../../components/InteractiveMap"), {
  ssr: false,
});

const schema = z.object({
  location: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  timestamp: z.string(),

  forest_area_percentage: z.number(),
  water_body_percentage: z.number(),
  mineral_richness_index: z.number(),
  soil_moisture_index: z.number(),
  enhanced_water_body_percentage: z.number(),

  forest_segmentation_percentage: z.number(),
  water_segmentation_percentage: z.number(),
  builtup_segmentation_percentage: z.number(),
  soil_segmentation_percentage: z.number(),

  preview_png: z.string(),
  mask_tif: z.string(),
  summary_csv: z.string(),

  raw_png: z.string().optional(),
});

// Enhanced custom theme
const customTheme = createTheme({
  palette: {
    primary: {
      main: "#2e7d32", // Forest green
      light: "#4caf50",
      dark: "#1b5e20",
    },
    secondary: {
      main: "#0288d1", // Water blue
      light: "#03a9f4",
      dark: "#01579b",
    },
    info: {
      main: "#0288d1",
      light: "#03a9f4",
      dark: "#01579b",
    },
    success: {
      main: "#2e7d32",
      light: "#4caf50",
      dark: "#1b5e20",
    },
    warning: {
      main: "#ed6c02",
      light: "#ff9800",
      dark: "#e65100",
    },
    error: {
      main: "#d32f2f",
      light: "#ef5350",
      dark: "#c62828",
    },
    purple: {
      main: "#7b1fa2",
      light: "#9c27b0",
      dark: "#6a1b9a",
    },
    indigo: {
      main: "#303f9f",
      light: "#3f51b5",
      dark: "#1a237e",
    },
    teal: {
      main: "#00796b",
      light: "#009688",
      dark: "#004d40",
    },
    background: {
      default: "#f8f9fa",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    subtitle2: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          "&:hover": {
            transform: "translateY(-5px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
          },
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: "16px 24px 8px",
        },
        title: {
          fontSize: "1.1rem",
          fontWeight: 600,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: "12px 24px 24px",
          "&:last-child": {
            paddingBottom: 24,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          fontWeight: 600,
          padding: "8px 16px",
        },
        contained: {
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          height: 32,
          fontWeight: 600,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        },
      },
    },
  },
});

// Refined color palette for charts
const chartColors = {
  forest: "#2e7d32",
  water: "#0288d1",
  builtup: "#7b1fa2",
  soil: "#ed6c02",
  background: "#f5f7fa",
  text: "#263238",
  success: "#4caf50",
  warning: "#ff9800",
  error: "#f44336",
};

// Helper for color selection based on value
const getValueColor = (value, goodThreshold = 40, warnThreshold = 20) =>
  value >= goodThreshold
    ? chartColors.success
    : value >= warnThreshold
    ? chartColors.warning
    : chartColors.error;

// Custom tooltip component for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 1.5,
          backgroundColor: "rgba(255,255,255,0.95)",
          border: "1px solid #e0e0e0",
          minWidth: 120,
        }}
      >
        <Typography variant="subtitle2" color="textPrimary">
          {payload[0].name || label}
        </Typography>
        <Typography variant="body2" color="primary" fontWeight="bold">
          {payload[0].value.toFixed(1)}%
        </Typography>
      </Paper>
    );
  }
  return null;
};

// Loading Spinner Component
const LoadingSpinner = () => (
  <Box
    sx={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f8f9fa",
    }}
  >
    <motion.div
      animate={{
        rotate: 360,
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "linear",
      }}
      style={{
        width: 60,
        height: 60,
        borderRadius: "50%",
        border: "3px solid rgba(0,0,0,0.05)",
        borderTopColor: chartColors.forest,
        marginBottom: 20,
      }}
    />
    <Typography variant="h6" style={{ color: "#333", fontSize: "1.25rem" }}>
      Loading analysis results...
    </Typography>
  </Box>
);

export default function NaturalResourcesResultsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [trend, setTrend] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("naturalResourcesResult");
    if (!raw) {
      router.replace("/");
      return;
    }

    try {
      const parsed = schema.parse(JSON.parse(raw));
      setData(parsed);

      const key = `nr_hist_${parsed.location}`;
      const hist = JSON.parse(localStorage.getItem(key) || "[]");
      hist.push({
        t: Date.now(),
        v: parsed.forest_segmentation_percentage,
      });
      // Keep only latest 12 measurements
      const last12 = hist.slice(-12);
      localStorage.setItem(key, JSON.stringify(last12));

      // Format dates for trend display
      const formattedTrend = last12.map((item, idx) => ({
        ...item,
        name:
          idx === last12.length - 1
            ? "Today"
            : `Day ${last12.length - idx - 1}`,
      }));

      setTrend(formattedTrend);

      // Simulate loading for smoother animations
      setTimeout(() => setIsLoading(false), 800);
    } catch (error) {
      console.error("Error parsing data:", error);
      localStorage.removeItem("naturalResourcesResult");
      router.replace("/");
    }
  }, [router]);

  const metrics = useMemo(() => {
    if (!data) return [];
    const {
      forest_segmentation_percentage: f,
      water_segmentation_percentage: w,
      builtup_segmentation_percentage: b,
      soil_segmentation_percentage: s,
    } = data;
    return [
      {
        name: "Forest",
        value: f,
        emoji: "🌳",
        icon: <ForestOutlined />,
        color: chartColors.forest,
      },
      {
        name: "Water",
        value: w,
        emoji: "💧",
        icon: <WaterDrop />,
        color: chartColors.water,
      },
      {
        name: "Built-up",
        value: b,
        emoji: "🏙️",
        icon: <ApartmentOutlined />,
        color: chartColors.builtup,
      },
      {
        name: "Soil",
        value: s,
        emoji: "💦",
        icon: <LandscapeOutlined />,
        color: chartColors.soil,
      },
    ];
  }, [data]);

  if (isLoading || !data) {
    return <LoadingSpinner />;
  }

  const {
    location,
    latitude,
    longitude,
    timestamp,
    preview_png,
    mask_tif,
    summary_csv,
    raw_png,
  } = data;
  const avg = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;

  // Calculate health status based on average and forest percentage
  const healthStatus =
    metrics[0].value > 30 && avg > 25
      ? "Healthy"
      : metrics[0].value > 20 && avg > 20
      ? "Moderate"
      : "Concerning";
  const healthColor =
    healthStatus === "Healthy"
      ? "success"
      : healthStatus === "Moderate"
      ? "warning"
      : "error";

  const delta = 0.05;
  const bbox = [
    latitude - delta,
    longitude - delta,
    latitude + delta,
    longitude + delta,
  ].join(",");
  const wmsImg = process.env.NEXT_PUBLIC_SH_INSTANCE_ID
    ? `https://services.sentinel-hub.com/ogc/wms/${process.env.NEXT_PUBLIC_SH_INSTANCE_ID}?SERVICE=WMS&VERSION=1.3.0` +
      `&REQUEST=GetMap&CRS=EPSG:4326&BBOX=${bbox}&LAYERS=TRUE_COLOR` +
      `&FORMAT=image/jpeg&WIDTH=800&HEIGHT=800`
    : null;

  const indexSummaries = [
    {
      icon: <ForestOutlined fontSize="large" />,
      emoji: "🌳",
      title: "NDVI Forest",
      value: data.forest_area_percentage,
      color: chartColors.forest,
    },
    {
      icon: <WaterDrop fontSize="large" />,
      emoji: "💧",
      title: "NDWI Water",
      value: data.water_body_percentage,
      color: chartColors.water,
    },
    {
      icon: <ApartmentOutlined fontSize="large" />,
      emoji: "🏗️",
      title: "NDBI Built-up",
      value: data.mineral_richness_index,
      color: chartColors.builtup,
    },
    {
      icon: <LandscapeOutlined fontSize="large" />,
      emoji: "💦",
      title: "NDMI Soil",
      value: data.soil_moisture_index,
      color: chartColors.soil,
    },
    {
      icon: <WaterDrop fontSize="large" />,
      emoji: "💧",
      title: "MNDWI+",
      value: data.enhanced_water_body_percentage,
      color: "#00796b", // teal
    },
  ];

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (delay) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay,
        duration: 0.6,
        ease: "easeOut",
      },
    }),
  };

  const getInsights = () => {
    const notes = [];
    const [f, w, b, s] = metrics;

    if (f.value < 10)
      notes.push({
        text: "Forest cover critically low – immediate afforestation needed.",
        icon: "⚠️",
        severity: "critical",
        color: chartColors.error,
      });
    else if (f.value < 25)
      notes.push({
        text: "Forest cover below recommended – monitor closely.",
        icon: "🌲",
        severity: "warning",
        color: chartColors.warning,
      });

    if (w.value < 5)
      notes.push({
        text: "Water bodies scarce – consider water-harvesting.",
        icon: "💧",
        severity: "warning",
        color: chartColors.warning,
      });
    else if (w.value > 50)
      notes.push({
        text: "High water coverage – assess flood risk.",
        icon: "🌊",
        severity: "warning",
        color: chartColors.warning,
      });

    if (b.value > 40)
      notes.push({
        text: "High built-up coverage – monitor urban sprawl.",
        icon: "🏙️",
        severity: "warning",
        color: chartColors.warning,
      });

    if (s.value < 15)
      notes.push({
        text: "Low soil moisture – drought risk present.",
        icon: "🏜️",
        severity: "warning",
        color: chartColors.warning,
      });

    return notes.length > 0
      ? notes
      : [
          {
            text: "All indices are within healthy ranges.",
            icon: "✅",
            severity: "good",
            color: chartColors.success,
          },
        ];
  };

  const insights = getInsights();

  return (
    <ThemeProvider theme={customTheme}>
      <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
        {/* Hero AppBar */}
        <AppBar
          position="sticky"
          elevation={1}
          sx={{
            bgcolor: "background.paper",
            color: "text.primary",
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.95), rgba(255,255,255,0.95))",
          }}
        >
          <Toolbar>
            <IconButton
              edge="start"
              onClick={() => router.back()}
              sx={{
                mr: 2,
                backgroundColor: alpha(chartColors.forest, 0.1),
                "&:hover": { backgroundColor: alpha(chartColors.forest, 0.2) },
              }}
            >
              <ArrowBack />
            </IconButton>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <ForestOutlined
                sx={{ fontSize: 28, mr: 1.5, color: "primary.main" }}
              />
              <Typography
                variant="h6"
                sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: "0.5px" }}
              >
                Natural Resources Analytics
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <Chip
              label={`Ecosystem: ${healthStatus}`}
              color={healthColor}
              sx={{
                fontWeight: 600,
                borderRadius: 4,
                px: 1,
                "& .MuiChip-label": { px: 1 },
              }}
            />
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* Location Header with Map Preview */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.8 } },
            }}
          >
            <Paper
              elevation={0}
              sx={{
                mb: 4,
                p: 3,
                borderRadius: 4,
                backgroundImage: `linear-gradient(135deg, ${alpha(
                  chartColors.forest,
                  0.1
                )} 0%, ${alpha(chartColors.water, 0.1)} 100%)`,
                border: "1px solid",
                borderColor: alpha(chartColors.forest, 0.2),
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: "center",
                justifyContent: "space-between",
                gap: 3,
              }}
            >
              <Box sx={{ textAlign: { xs: "center", md: "left" }, flex: 1 }}>
                <Typography
                  variant="h5"
                  fontWeight="bold"
                  gutterBottom
                  sx={{ color: "primary.dark" }}
                >
                  {location}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: { xs: "center", md: "flex-start" },
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Chip
                    icon={<Schedule fontSize="small" />}
                    label={new Date(timestamp).toLocaleString()}
                    size="small"
                    sx={{
                      backgroundColor: alpha(chartColors.forest, 0.1),
                      color: "primary.dark",
                      "& .MuiChip-icon": { color: "primary.main" },
                    }}
                  />
                  <Chip
                    label={`Lat: ${latitude.toFixed(
                      4
                    )}, Lng: ${longitude.toFixed(4)}`}
                    size="small"
                    sx={{
                      backgroundColor: alpha(chartColors.water, 0.1),
                      color: "secondary.dark",
                    }}
                  />
                </Box>
                <Typography
                  variant="body1"
                  color="textSecondary"
                  sx={{ maxWidth: 500 }}
                >
                  This analysis combines satellite imagery and advanced
                  segmentation to provide detailed insights into the natural
                  resources and ecosystem health of this location.
                </Typography>
              </Box>

              <Box
                sx={{
                  width: { xs: "100%", md: 200 },
                  height: { xs: 150, md: 150 },
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 3,
                  border: "4px solid white",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              >
                <Box
                  component="img"
                  src={preview_png || raw_png || wmsImg}
                  alt="Location preview"
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </Box>
            </Paper>
          </motion.div>

          {/* Score Overview Cards */}
          <Box sx={{ mb: 5 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                mb: 2.5,
                display: "flex",
                alignItems: "center",
                color: "text.primary",
                fontWeight: 700,
                "&::after": {
                  content: '""',
                  flexGrow: 1,
                  height: "2px",
                  backgroundColor: alpha(chartColors.forest, 0.1),
                  ml: 2,
                },
              }}
            >
              Key Metrics Summary
            </Typography>
            <Grid container spacing={3}>
              {metrics.map((metric, idx) => (
                <Grid item xs={12} sm={6} md={3} key={metric.name}>
                  <motion.div
                    custom={idx * 0.1}
                    initial="hidden"
                    animate="visible"
                    variants={fadeInUp}
                  >
                    <Card
                      elevation={0}
                      sx={{
                        backgroundColor: alpha(metric.color, 0.05),
                        border: "1px solid",
                        borderColor: alpha(metric.color, 0.2),
                        height: "100%",
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            mb: 2,
                          }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: alpha(metric.color, 0.15),
                              color: metric.color,
                              width: 56,
                              height: 56,
                              fontSize: "2rem",
                              mr: 2,
                            }}
                          >
                            {metric.emoji}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="h5"
                              fontWeight="bold"
                              sx={{ color: metric.color }}
                            >
                              {metric.value.toFixed(1)}%
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {metric.name} Coverage
                            </Typography>
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            mt: 1,
                            pt: 1,
                            borderTop: `1px solid ${alpha(metric.color, 0.2)}`,
                          }}
                        >
                          <Box
                            sx={{
                              width: "100%",
                              height: 4,
                              backgroundColor: alpha(metric.color, 0.15),
                              borderRadius: 2,
                              overflow: "hidden",
                            }}
                          >
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(100, metric.value)}%`,
                              }}
                              transition={{
                                duration: 1,
                                delay: 0.5 + idx * 0.1,
                              }}
                              style={{
                                height: "100%",
                                backgroundColor: metric.color,
                              }}
                            />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Remote Sensing Indices */}
          <Box sx={{ mb: 5 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                mb: 2.5,
                display: "flex",
                alignItems: "center",
                color: "text.primary",
                fontWeight: 700,
                "&::after": {
                  content: '""',
                  flexGrow: 1,
                  height: "2px",
                  backgroundColor: alpha(chartColors.forest, 0.1),
                  ml: 2,
                },
              }}
            >
              Remote Sensing Indices
            </Typography>
            <Grid container spacing={3}>
              {indexSummaries.map((item, idx) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  lg={idx === 4 ? 12 : 3}
                  key={item.title}
                >
                  <motion.div
                    custom={(idx + 4) * 0.1}
                    initial="hidden"
                    animate="visible"
                    variants={fadeInUp}
                  >
                    <Card
                      elevation={0}
                      sx={{
                        height: "100%",
                        backgroundColor:
                          idx === 4
                            ? alpha(item.color, 0.05)
                            : "background.paper", // Special treatment for the last item
                        border: "1px solid",
                        borderColor: alpha(item.color, 0.2),
                      }}
                    >
                      <CardContent>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            flexDirection: idx === 4 ? "row" : "column",
                            textAlign: idx === 4 ? "left" : "center",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 60,
                              height: 60,
                              backgroundColor: alpha(item.color, 0.1),
                              color: item.color,
                              borderRadius: "50%",
                              mb: idx === 4 ? 0 : 2,
                              mr: idx === 4 ? 3 : 0,
                            }}
                          >
                            {React.cloneElement(item.icon, {
                              fontSize: "large",
                            })}
                          </Box>
                          <Box>
                            <Typography
                              variant="subtitle1"
                              color="textSecondary"
                              gutterBottom
                            >
                              {item.title}
                            </Typography>
                            <Typography
                              variant="h4"
                              sx={{ color: item.color, fontWeight: 700 }}
                            >
                              {item.value.toFixed(1)}%
                            </Typography>
                            {idx === 4 && (
                              <Typography
                                variant="body2"
                                color="textSecondary"
                                sx={{ mt: 0.5 }}
                              >
                                Enhanced water detection using Modified
                                Normalized Difference Water Index
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Data Visualization Section */}
          <Box sx={{ mb: 5 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                mb: 2.5,
                display: "flex",
                alignItems: "center",
                color: "text.primary",
                fontWeight: 700,
                "&::after": {
                  content: '""',
                  flexGrow: 1,
                  height: "2px",
                  backgroundColor: alpha(chartColors.forest, 0.1),
                  ml: 2,
                },
              }}
            >
              Data Visualization
            </Typography>
            <Grid container spacing={3}>
              {/* Bar Chart */}
              <Grid item xs={12} md={4}>
                <motion.div
                  custom={0.9}
                  initial="hidden"
                  animate="visible"
                  variants={fadeInUp}
                >
                  <Card
                    elevation={0}
                    sx={{
                      height: "100%",
                      backgroundColor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <CardHeader
                      title="Land Distribution"
                      titleTypographyProps={{
                        variant: "h6",
                        fontWeight: 600,
                        fontSize: "1rem",
                      }}
                    />
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                          data={metrics}
                          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke={alpha("#000", 0.05)}
                          />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <ReTooltip content={<CustomTooltip />} />
                          <Bar
                            dataKey="value"
                            radius={[8, 8, 0, 0]}
                            barSize={40}
                          >
                            {metrics.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Radar Chart */}
              <Grid item xs={12} md={4}>
                <motion.div
                  custom={1.0}
                  initial="hidden"
                  animate="visible"
                  variants={fadeInUp}
                >
                  <Card
                    elevation={0}
                    sx={{
                      height: "100%",
                      backgroundColor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <CardHeader
                      title="Distribution Radar"
                      titleTypographyProps={{
                        variant: "h6",
                        fontWeight: 600,
                        fontSize: "1rem",
                      }}
                    />
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <RadarChart outerRadius={90} data={metrics}>
                          <PolarGrid stroke={alpha("#000", 0.05)} />
                          <PolarAngleAxis
                            dataKey="name"
                            tick={{ fill: chartColors.text, fontSize: 12 }}
                          />
                          <ReTooltip content={<CustomTooltip />} />
                          <Radar
                            name="Land Cover"
                            dataKey="value"
                            stroke={chartColors.forest}
                            fill={alpha(chartColors.forest, 0.6)}
                            fillOpacity={0.5}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Pie Chart */}
              <Grid item xs={12} md={4}>
                <motion.div
                  custom={1.1}
                  initial="hidden"
                  animate="visible"
                  variants={fadeInUp}
                >
                  <Card
                    elevation={0}
                    sx={{
                      height: "100%",
                      backgroundColor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <CardHeader
                      title="Land-Class Share"
                      titleTypographyProps={{
                        variant: "h6",
                        fontWeight: 600,
                        fontSize: "1rem",
                      }}
                    />
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={metrics}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {metrics.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                stroke={alpha(entry.color, 0.8)}
                                strokeWidth={1}
                              />
                            ))}
                          </Pie>
                          <ReTooltip content={<CustomTooltip />} />
                          <Legend
                            verticalAlign="bottom"
                            iconType="circle"
                            layout="horizontal"
                            wrapperStyle={{ paddingTop: 20 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            </Grid>
          </Box>

          {/* Forest Trend */}
          {trend.length > 1 && (
            <Box sx={{ mb: 5 }}>
              <motion.div
                custom={1.2}
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
              >
                <Card
                  elevation={0}
                  sx={{
                    backgroundColor: alpha(chartColors.forest, 0.05),
                    border: "1px solid",
                    borderColor: alpha(chartColors.forest, 0.2),
                  }}
                >
                  <CardHeader
                    title="Forest Coverage Trend"
                    titleTypographyProps={{
                      variant: "h6",
                      fontWeight: 600,
                      fontSize: "1rem",
                    }}
                    subheader="Recent measurements over time"
                  />
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart
                        data={trend}
                        margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient
                            id="forestGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={chartColors.forest}
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor={chartColors.forest}
                              stopOpacity={0.1}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke={alpha("#000", 0.05)}
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: chartColors.text, fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => `${value}%`}
                          tick={{ fill: chartColors.text, fontSize: 12 }}
                          domain={["dataMin - 5", "dataMax + 5"]}
                        />
                        <ReTooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="v"
                          stroke={chartColors.forest}
                          fillOpacity={1}
                          fill="url(#forestGradient)"
                          strokeWidth={3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            </Box>
          )}

          {/* Image Analysis Gallery */}
          <Box sx={{ mb: 5 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                mb: 2.5,
                display: "flex",
                alignItems: "center",
                color: "text.primary",
                fontWeight: 700,
                "&::after": {
                  content: '""',
                  flexGrow: 1,
                  height: "2px",
                  backgroundColor: alpha(chartColors.forest, 0.1),
                  ml: 2,
                },
              }}
            >
              Satellite Image Analysis
            </Typography>
            <Grid container spacing={3}>
              {/* Raw True-Color Image */}
              {(raw_png || wmsImg) && (
                <Grid item xs={12} sm={6} md={3}>
                  <motion.div
                    custom={1.3}
                    initial="hidden"
                    animate="visible"
                    variants={fadeInUp}
                  >
                    <Card
                      elevation={0}
                      sx={{
                        height: "100%",
                        border: "1px solid",
                        borderColor: "divider",
                        "& img": {
                          transition: "transform 0.5s ease",
                          "&:hover": {
                            transform: "scale(1.05)",
                          },
                        },
                      }}
                    >
                      <CardHeader
                        title="Raw True-Color"
                        titleTypographyProps={{
                          variant: "subtitle1",
                          fontWeight: 600,
                        }}
                        subheader="Satellite image"
                        sx={{ pb: 1 }}
                      />
                      <CardContent sx={{ p: 0, overflow: "hidden" }}>
                        <Box
                          component="img"
                          src={raw_png || wmsImg}
                          alt="Raw True-Color"
                          sx={{
                            width: "100%",
                            height: 240,
                            objectFit: "cover",
                          }}
                        />
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              )}

              {/* Segmentation Preview */}
              <Grid item xs={12} sm={6} md={3}>
                <motion.div
                  custom={1.4}
                  initial="hidden"
                  animate="visible"
                  variants={fadeInUp}
                >
                  <Card
                    elevation={0}
                    sx={{
                      height: "100%",
                      border: "1px solid",
                      borderColor: "divider",
                      "& img": {
                        transition: "transform 0.5s ease",
                        "&:hover": {
                          transform: "scale(1.05)",
                        },
                      },
                    }}
                  >
                    <CardHeader
                      title="Segmentation Preview"
                      titleTypographyProps={{
                        variant: "subtitle1",
                        fontWeight: 600,
                      }}
                      subheader="Classification results"
                      sx={{ pb: 1 }}
                    />
                    <CardContent sx={{ p: 0, overflow: "hidden" }}>
                      <Box
                        component="img"
                        src={preview_png}
                        alt="Segmentation Preview"
                        sx={{
                          width: "100%",
                          height: 240,
                          objectFit: "cover",
                        }}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Mask TIFF */}
              <Grid item xs={12} sm={6} md={3}>
                <motion.div
                  custom={1.5}
                  initial="hidden"
                  animate="visible"
                  variants={fadeInUp}
                >
                  <Card
                    elevation={0}
                    sx={{
                      height: "100%",
                      border: "1px solid",
                      borderColor: "divider",
                      "& img": {
                        transition: "transform 0.5s ease",
                        "&:hover": {
                          transform: "scale(1.05)",
                        },
                      },
                    }}
                  >
                    <CardHeader
                      title="Mask TIFF"
                      titleTypographyProps={{
                        variant: "subtitle1",
                        fontWeight: 600,
                      }}
                      subheader="GeoTIFF classification"
                      sx={{ pb: 1 }}
                    />
                    <CardContent sx={{ p: 0, overflow: "hidden" }}>
                      <Box
                        sx={{
                          position: "relative",
                          width: "100%",
                          height: 240,
                        }}
                      >
                        <object
                          data={mask_tif}
                          type="image/tiff"
                          width="100%"
                          height="100%"
                          style={{ display: "block", objectFit: "cover" }}
                        >
                          <Box
                            component="img"
                            src={preview_png}
                            alt="Mask Preview Fallback"
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </object>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              {/* Overlay */}
              {(raw_png || wmsImg) && (
                <Grid item xs={12} sm={6} md={3}>
                  <motion.div
                    custom={1.6}
                    initial="hidden"
                    animate="visible"
                    variants={fadeInUp}
                  >
                    <Card
                      elevation={0}
                      sx={{
                        height: "100%",
                        border: "1px solid",
                        borderColor: "divider",
                        "&:hover .overlay-img": {
                          opacity: 0.8,
                        },
                      }}
                    >
                      <CardHeader
                        title="Overlay Analysis"
                        titleTypographyProps={{
                          variant: "subtitle1",
                          fontWeight: 600,
                        }}
                        subheader="Classification + Satellite"
                        sx={{ pb: 1 }}
                      />
                      <CardContent
                        sx={{ p: 0, position: "relative", overflow: "hidden" }}
                      >
                        <Box
                          sx={{
                            position: "relative",
                            width: "100%",
                            height: 240,
                          }}
                        >
                          <Box
                            component="img"
                            src={raw_png || wmsImg}
                            alt="Overlay Background"
                            sx={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          <Box
                            className="overlay-img"
                            component="img"
                            src={preview_png}
                            alt="Overlay Segmentation"
                            sx={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              opacity: 0.5,
                              transition: "opacity 0.3s ease",
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              )}
            </Grid>
          </Box>

          {/* Map Section */}
          <Box sx={{ mb: 5 }}>
            <motion.div
              custom={1.7}
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
            >
              <Card
                elevation={0}
                sx={{
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 4,
                }}
              >
                <CardHeader
                  title="Geographic Location"
                  titleTypographyProps={{
                    variant: "h6",
                    fontWeight: 600,
                  }}
                  subheader={`Coordinates: ${latitude.toFixed(
                    4
                  )}°, ${longitude.toFixed(4)}°`}
                />
                <CardContent sx={{ p: 0, height: 400 }}>
                  <InteractiveMap lat={latitude} lon={longitude} />
                </CardContent>
              </Card>
            </motion.div>
          </Box>

          {/* Insights & Recommendations */}
          <Box sx={{ mb: 5 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                mb: 2.5,
                display: "flex",
                alignItems: "center",
                color: "text.primary",
                fontWeight: 700,
                "&::after": {
                  content: '""',
                  flexGrow: 1,
                  height: "2px",
                  backgroundColor: alpha(chartColors.forest, 0.1),
                  ml: 2,
                },
              }}
            >
              Insights & Recommendations
            </Typography>
            <motion.div
              custom={1.8}
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
            >
              <Card
                elevation={0}
                sx={{
                  backgroundColor: alpha(chartColors.forest, 0.05),
                  border: "1px solid",
                  borderColor: alpha(chartColors.forest, 0.2),
                }}
              >
                <CardHeader
                  title="Ecosystem Analysis"
                  titleTypographyProps={{
                    variant: "h6",
                    fontWeight: 600,
                  }}
                  avatar={
                    <Avatar
                      sx={{
                        backgroundColor: alpha(chartColors.forest, 0.2),
                        color: chartColors.forest,
                      }}
                    >
                      <InfoOutlined />
                    </Avatar>
                  }
                />
                <CardContent>
                  <Grid container spacing={3}>
                    {insights.map((insight, idx) => (
                      <Grid
                        item
                        xs={12}
                        md={insights.length === 1 ? 12 : 6}
                        key={idx}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            p: 2,
                            borderRadius: 2,
                            backgroundColor: alpha(insight.color, 0.05),
                            border: "1px solid",
                            borderColor: alpha(insight.color, 0.2),
                          }}
                        >
                          <Typography variant="h5" sx={{ mr: 2 }}>
                            {insight.icon}
                          </Typography>
                          <Typography variant="body1" color="text.primary">
                            {insight.text}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}

                    {/* Recommendations */}
                    <Grid item xs={12} sx={{ mt: 2 }}>
                      <Box
                        sx={{
                          mt: 2,
                          p: 3,
                          borderRadius: 2,
                          backgroundColor: alpha(chartColors.forest, 0.05),
                          border: "1px dashed",
                          borderColor: alpha(chartColors.forest, 0.3),
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          fontWeight="bold"
                          color="primary.main"
                          gutterBottom
                        >
                          Recommended Actions:
                        </Typography>
                        <Typography variant="body1" paragraph>
                          Based on our analysis of the {location} area, we
                          recommend the following actions to maintain and
                          improve ecosystem health:
                        </Typography>

                        <Grid container spacing={2}>
                          {metrics[0].value < 30 && (
                            <Grid item xs={12} md={4}>
                              <Box
                                sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  backgroundColor: "white",
                                  borderLeft: `4px solid ${chartColors.forest}`,
                                  height: "100%",
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="bold"
                                  gutterBottom
                                >
                                  Increase Forest Coverage
                                </Typography>
                                <Typography variant="body2">
                                  Implement reforestation efforts to increase
                                  forest coverage to at least 30% of the total
                                  area.
                                </Typography>
                              </Box>
                            </Grid>
                          )}

                          {metrics[1].value < 10 && (
                            <Grid item xs={12} md={4}>
                              <Box
                                sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  backgroundColor: "white",
                                  borderLeft: `4px solid ${chartColors.water}`,
                                  height: "100%",
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="bold"
                                  gutterBottom
                                >
                                  Water Conservation
                                </Typography>
                                <Typography variant="body2">
                                  Develop water conservation strategies
                                  including rainwater harvesting and watershed
                                  protection.
                                </Typography>
                              </Box>
                            </Grid>
                          )}

                          {metrics[2].value > 40 && (
                            <Grid item xs={12} md={4}>
                              <Box
                                sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  backgroundColor: "white",
                                  borderLeft: `4px solid ${chartColors.builtup}`,
                                  height: "100%",
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="bold"
                                  gutterBottom
                                >
                                  Urban Planning
                                </Typography>
                                <Typography variant="body2">
                                  Implement green infrastructure and urban
                                  planning to balance built-up areas with
                                  natural spaces.
                                </Typography>
                              </Box>
                            </Grid>
                          )}

                          {metrics[3].value < 20 && (
                            <Grid item xs={12} md={4}>
                              <Box
                                sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  backgroundColor: "white",
                                  borderLeft: `4px solid ${chartColors.soil}`,
                                  height: "100%",
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  fontWeight="bold"
                                  gutterBottom
                                >
                                  Soil Management
                                </Typography>
                                <Typography variant="body2">
                                  Implement soil conservation practices to
                                  improve moisture retention and prevent
                                  erosion.
                                </Typography>
                              </Box>
                            </Grid>
                          )}

                          <Grid item xs={12} md={4}>
                            <Box
                              sx={{
                                p: 2,
                                borderRadius: 2,
                                backgroundColor: "white",
                                borderLeft: `4px solid ${chartColors.forest}`,
                                height: "100%",
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                fontWeight="bold"
                                gutterBottom
                              >
                                Monitoring Program
                              </Typography>
                              <Typography variant="body2">
                                Establish a regular monitoring program to track
                                changes in natural resource metrics over time.
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </motion.div>
          </Box>

          {/* Download Outputs */}
          <Box sx={{ mb: 5 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                mb: 2.5,
                display: "flex",
                alignItems: "center",
                color: "text.primary",
                fontWeight: 700,
                "&::after": {
                  content: '""',
                  flexGrow: 1,
                  height: "2px",
                  backgroundColor: alpha(chartColors.forest, 0.1),
                  ml: 2,
                },
              }}
            >
              Download Data
            </Typography>
            <motion.div
              custom={1.9}
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
            >
              <Card
                elevation={0}
                sx={{
                  backgroundColor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <CardContent sx={{ py: 3 }}>
                  <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={6}>
                      <Typography variant="body1" paragraph>
                        Download the raw data and analysis results for offline
                        use or further processing. All files include detailed
                        metadata and are compatible with common GIS software.
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 2,
                          flexWrap: "wrap",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Button
                          startIcon={<Download />}
                          variant="contained"
                          color="primary"
                          component="a"
                          href={summary_csv}
                          download
                          sx={{
                            px: 3,
                            py: 1.2,
                            borderRadius: 2,
                            color: "white",
                            "&:hover": {
                              backgroundColor: "primary.dark",
                              transform: "translateY(-2px)",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            },
                            transition:
                              "transform 0.2s ease, box-shadow 0.2s ease",
                          }}
                        >
                          Pixel Summary CSV
                        </Button>
                        <Button
                          startIcon={<Download />}
                          variant="contained"
                          color="secondary"
                          component="a"
                          href={preview_png}
                          download
                          sx={{
                            px: 3,
                            py: 1.2,
                            borderRadius: 2,
                            color: "white",
                            "&:hover": {
                              backgroundColor: "secondary.dark",
                              transform: "translateY(-2px)",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            },
                            transition:
                              "transform 0.2s ease, box-shadow 0.2s ease",
                          }}
                        >
                          Preview PNG
                        </Button>
                        <Button
                          startIcon={<Download />}
                          variant="contained"
                          color="info"
                          component="a"
                          href={mask_tif}
                          download
                          sx={{
                            px: 3,
                            py: 1.2,
                            borderRadius: 2,
                            color: "white",
                            "&:hover": {
                              backgroundColor: "info.dark",
                              transform: "translateY(-2px)",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            },
                            transition:
                              "transform 0.2s ease, box-shadow 0.2s ease",
                          }}
                        >
                          Mask GeoTIFF
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </motion.div>
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 8, mb: 3, textAlign: "center" }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.0, duration: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Natural Resources Analysis Report • Generated on{" "}
                {new Date(timestamp).toLocaleDateString()}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Location: {location} • Coordinates: {latitude.toFixed(4)}°,{" "}
                {longitude.toFixed(4)}°
              </Typography>
            </motion.div>
          </Box>
        </Container>
      </div>
    </ThemeProvider>
  );
}
